from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.champion import ChampionStat
from app.models.match import Match, MatchParticipant
from app.services import ddragon

# 티어 순서 (낮은 것부터). "OO 이상" 필터에서 사용.
TIER_ORDER = [
    "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD",
    "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER",
]


async def get_champion_positions(db: AsyncSession) -> dict[int, list[str]]:
    """
    챔피언별로 우리 DB에 기록된 매치에서 실제로 플레이된 포지션 목록을
    반환한다 (Riot이 "이 챔피언은 어느 포지션이다"라는 공식 데이터를 주지
    않아서, 실제 매치 데이터 기준으로 추정한다). 매치 기록이 없는 챔피언은
    빈 리스트가 된다 — 챔피언 검색 사이드바의 포지션 필터용.
    """
    query = (
        select(MatchParticipant.champion_id, MatchParticipant.team_position)
        .where(MatchParticipant.team_position != "")
        .distinct()
    )
    rows = (await db.execute(query)).all()
    result: dict[int, list[str]] = {}
    for champion_id, position in rows:
        result.setdefault(champion_id, []).append(position)
    return result


async def get_tier_list(
    db: AsyncSession, patch: str, position: str | None = None
) -> list[ChampionStat]:
    query = select(ChampionStat).where(ChampionStat.patch == patch)
    if position:
        query = query.where(ChampionStat.position == position)
    query = query.order_by(ChampionStat.win_rate.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_champion_detail(
    db: AsyncSession, champion_id: int, patch: str
) -> ChampionStat | None:
    result = await db.execute(
        select(ChampionStat).where(
            ChampionStat.champion_id == champion_id, ChampionStat.patch == patch
        )
    )
    return result.scalar_one_or_none()


def _tier_from_win_rate(win_rate: float, sample_size: int) -> str:
    if sample_size < 3:
        return "?"
    if win_rate >= 52:
        return "S"
    if win_rate >= 51:
        return "A"
    if win_rate >= 49:
        return "B"
    if win_rate >= 47:
        return "C"
    if win_rate >= 45:
        return "D"
    if win_rate >= 43:
        return "E"
    return "F"


async def get_champion_stats_for_puuid(
    db: AsyncSession, puuid: str, queue_ids: list[int] | None = None
) -> list[dict]:
    """
    특정 소환사가 실제로 플레이한 챔피언만 집계한다 (get_aggregated_stats와
    달리 DB에 쌓인 모든 유저의 매치가 아니라 이 puuid의 매치만 대상으로 함).
    queue_ids가 주어지면 해당 게임 모드(예: 소환사의 협곡, 칼바람 나락)의
    매치만 집계한다. 게임 수가 많은 챔피언부터 정렬한다.
    """
    base_filter = [MatchParticipant.puuid == puuid]

    total_games_query = select(func.count()).select_from(MatchParticipant)
    if queue_ids:
        total_games_query = total_games_query.join(Match, Match.id == MatchParticipant.match_id).where(
            *base_filter, Match.queue_id.in_(queue_ids)
        )
    else:
        total_games_query = total_games_query.where(*base_filter)

    total_games = (await db.execute(total_games_query)).scalar() or 0
    if total_games == 0:
        return []

    query = (
        select(
            MatchParticipant.champion_id,
            func.max(MatchParticipant.team_position).label("position"),
            func.count().label("games"),
            func.sum(case((MatchParticipant.win.is_(True), 1), else_=0)).label("wins"),
            func.sum(MatchParticipant.kills).label("total_kills"),
            func.sum(MatchParticipant.deaths).label("total_deaths"),
            func.sum(MatchParticipant.assists).label("total_assists"),
            func.sum(MatchParticipant.cs).label("total_cs"),
            func.sum(MatchParticipant.double_kills).label("total_double_kills"),
            func.sum(MatchParticipant.triple_kills).label("total_triple_kills"),
            func.sum(MatchParticipant.quadra_kills).label("total_quadra_kills"),
            func.sum(MatchParticipant.penta_kills).label("total_penta_kills"),
            func.sum(Match.game_duration).label("total_duration_seconds"),
        )
        .join(Match, Match.id == MatchParticipant.match_id)
        .where(*base_filter)
        .group_by(MatchParticipant.champion_id)
    )
    if queue_ids:
        query = query.where(Match.queue_id.in_(queue_ids))
    rows = (await db.execute(query)).all()
    name_map = await ddragon.get_champion_name_map()

    results = []
    for row in rows:
        games = row.games
        wins = row.wins
        losses = games - wins
        win_rate = round(wins / games * 100, 1) if games else 0.0

        avg_kills = round(row.total_kills / games, 1)
        avg_deaths = round(row.total_deaths / games, 1)
        avg_assists = round(row.total_assists / games, 1)
        avg_cs = round(row.total_cs / games, 1)
        kda = round((row.total_kills + row.total_assists) / max(row.total_deaths, 1), 2)

        total_minutes = (row.total_duration_seconds or 0) / 60
        cs_per_min = round(row.total_cs / total_minutes, 1) if total_minutes else 0.0

        results.append(
            {
                "champion_id": row.champion_id,
                "champion_name": name_map.get(row.champion_id, f"챔피언 {row.champion_id}"),
                "patch": "이 소환사의 기록",
                "position": row.position or "UNKNOWN",
                "tier": _tier_from_win_rate(win_rate, games),
                "win_rate": win_rate,
                "pick_rate": round(games / total_games * 100, 1),
                "ban_rate": 0.0,
                "sample_size": games,
                "games": games,
                "wins": wins,
                "losses": losses,
                "kda": kda,
                "kills": avg_kills,
                "deaths": avg_deaths,
                "assists": avg_assists,
                "cs": avg_cs,
                "cs_per_min": cs_per_min,
                "double_kills": row.total_double_kills,
                "triple_kills": row.total_triple_kills,
                "quadra_kills": row.total_quadra_kills,
                "penta_kills": row.total_penta_kills,
            }
        )

    # 플레이한 게임이 많은 챔피언부터 정렬 (요청사항)
    results.sort(key=lambda r: r["games"], reverse=True)
    return results


async def get_aggregated_stats(
    db: AsyncSession, position: str | None = None, queue_ids: list[int] | None = None
) -> list[dict]:
    """
    champion_stats 정적 테이블(배치로 채워지는 용도) 대신, 지금까지
    match_participants 테이블에 실제로 쌓인 매치 데이터를 즉석으로 집계해
    챔피언별 승률/픽률/표본 수를 계산한다. 표본이 적을수록 신뢰도가
    낮으므로 sample_size가 3 미만이면 티어를 "?"로 표시한다.
    queue_ids를 넘기면 해당 게임 모드(예: 솔로랭크, 자유랭크)만 집계한다.
    """
    total_games_query = select(func.count()).select_from(MatchParticipant)
    if queue_ids:
        total_games_query = total_games_query.join(
            Match, Match.id == MatchParticipant.match_id
        ).where(Match.queue_id.in_(queue_ids))
    total_games = (await db.execute(total_games_query)).scalar() or 0
    if total_games == 0:
        return []

    query = select(
        MatchParticipant.champion_id,
        MatchParticipant.team_position,
        func.count().label("games"),
        func.sum(case((MatchParticipant.win.is_(True), 1), else_=0)).label("wins"),
    ).group_by(MatchParticipant.champion_id, MatchParticipant.team_position)

    if queue_ids:
        query = query.join(Match, Match.id == MatchParticipant.match_id).where(
            Match.queue_id.in_(queue_ids)
        )
    if position:
        query = query.where(MatchParticipant.team_position == position)

    rows = (await db.execute(query)).all()
    name_map = await ddragon.get_champion_name_map()

    results = []
    for champion_id, team_position, games, wins in rows:
        win_rate = round(wins / games * 100, 1) if games else 0.0
        pick_rate = round(games / total_games * 100, 1)
        results.append(
            {
                "champion_id": champion_id,
                "champion_name": name_map.get(champion_id, f"챔피언 {champion_id}"),
                "patch": "실시간 집계",
                "position": team_position or "UNKNOWN",
                "tier": _tier_from_win_rate(win_rate, games),
                "win_rate": win_rate,
                "pick_rate": pick_rate,
                "ban_rate": 0.0,
                "sample_size": games,
            }
        )

    results.sort(key=lambda r: r["win_rate"], reverse=True)
    return results


async def get_champion_rune_page_detail(
    db: AsyncSession,
    champion_id: int,
    primary_style: int,
    sub_style: int,
    position: str | None = None,
    queue_ids: list[int] | None = None,
    tier: str | None = None,
    sample_limit: int = 500,
) -> dict | None:
    """
    특정 룬 페이지 조합(주 룬트리 + 보조 룬트리)에서, 실제 클라이언트 룬
    페이지 화면처럼 "이 조합에서 각 줄마다 어떤 룬을 골랐는지"를 계산한다.
    주 룬트리는 4줄(키스톤+3슬롯) 전부, 보조 룬트리는 실제로 고른 3개 줄
    중 2개 줄만 표시 대상이 된다.
    """
    query = select(MatchParticipant).where(MatchParticipant.champion_id == champion_id)
    if position:
        query = query.where(MatchParticipant.team_position == position)
    if queue_ids:
        query = query.join(Match, Match.id == MatchParticipant.match_id).where(
            Match.queue_id.in_(queue_ids)
        )
    if tier and tier.upper() != "ALL":
        tier_upper = tier.upper()
        is_plus = tier_upper.endswith("_PLUS")
        base_tier = tier_upper[: -len("_PLUS")] if is_plus else tier_upper
        if base_tier not in TIER_ORDER:
            raise ValueError(f"지원하지 않는 티어입니다: {tier}")
        target_rank = TIER_ORDER.index(base_tier)
        tier_rank_case = case(
            {t: i for i, t in enumerate(TIER_ORDER)},
            value=MatchParticipant.tier_at_sync,
            else_=-1,
        )
        if is_plus:
            query = query.where(tier_rank_case >= target_rank)
        else:
            query = query.where(tier_rank_case == target_rank)
    query = query.limit(sample_limit)

    rows = list((await db.execute(query)).scalars().all())
    filtered = [
        r
        for r in rows
        if (r.runes or {}).get("primary_style") == primary_style
        and (r.runes or {}).get("sub_style") == sub_style
    ]
    if not filtered:
        return None

    # 주 룬트리: 4줄 전부, 각 줄의 모든 옵션에 승률/픽률/게임수를 계산하고
    # 가장 많이 선택된 룬을 "선택됨"으로 표시
    total_games = len(filtered)
    primary_structure = ddragon.get_rune_tree_structure(primary_style)
    primary_rows: list[dict] = []
    for row_idx, row_rune_ids in enumerate(primary_structure):
        groups = {rid: {"games": 0, "wins": 0} for rid in row_rune_ids}
        for r in filtered:
            runes = r.runes or {}
            if row_idx == 0:
                pick = runes.get("keystone")
            else:
                primary_runes = runes.get("primary_runes", [])
                pick = primary_runes[row_idx] if len(primary_runes) > row_idx else None
            if pick in groups:
                groups[pick]["games"] += 1
                if r.win:
                    groups[pick]["wins"] += 1

        options = []
        for rid in row_rune_ids:
            g = groups[rid]
            options.append(
                {
                    "rune_id": rid,
                    "icon_url": ddragon.rune_icon_url(rid),
                    "games": g["games"],
                    "win_rate": round(g["wins"] / g["games"] * 100, 1) if g["games"] else 0.0,
                    "pick_rate": round(g["games"] / total_games * 100, 1) if total_games else 0.0,
                }
            )
        chosen_id = max(options, key=lambda o: o["games"])["rune_id"] if options else None
        for o in options:
            o["chosen"] = o["games"] > 0 and o["rune_id"] == chosen_id
        primary_rows.append({"options": options})

    # 보조 룬트리: 키스톤 줄(0번)은 보조에서 고를 수 없으니 제외. 각 줄의
    # 모든 옵션에 승률/픽률/게임수를 계산하고, 실제로 가장 많이 선택된
    # 룬 2개가 속한 줄만 "선택됨" 표시.
    sub_structure = ddragon.get_rune_tree_structure(sub_style)[1:]
    secondary_pick_games: dict[int, dict] = {}
    for r in filtered:
        for rid in (r.runes or {}).get("secondary_runes", []):
            g = secondary_pick_games.setdefault(rid, {"games": 0, "wins": 0})
            g["games"] += 1
            if r.win:
                g["wins"] += 1
    top2 = sorted(secondary_pick_games.items(), key=lambda kv: kv[1]["games"], reverse=True)[:2]
    top2_ids = {rid for rid, _ in top2}

    secondary_rows: list[dict] = []
    for row_rune_ids in sub_structure:
        options = []
        for rid in row_rune_ids:
            g = secondary_pick_games.get(rid, {"games": 0, "wins": 0})
            options.append(
                {
                    "rune_id": rid,
                    "icon_url": ddragon.rune_icon_url(rid),
                    "games": g["games"],
                    "win_rate": round(g["wins"] / g["games"] * 100, 1) if g["games"] else 0.0,
                    "pick_rate": round(g["games"] / total_games * 100, 1) if total_games else 0.0,
                    "chosen": rid in top2_ids,
                }
            )
        secondary_rows.append({"options": options})

    all_style_ids = ddragon.all_rune_style_ids()
    return {
        "champion_id": champion_id,
        "primary_style": primary_style,
        "primary_style_icon_url": ddragon.rune_style_icon_url(primary_style),
        "sub_style": sub_style,
        "sub_style_icon_url": ddragon.rune_style_icon_url(sub_style),
        "all_style_ids": all_style_ids,
        "all_style_icon_urls": {sid: ddragon.rune_style_icon_url(sid) for sid in all_style_ids},
        "primary_rows": primary_rows,
        "secondary_rows": secondary_rows,
        "games": len(filtered),
    }


async def get_champion_build(
    db: AsyncSession,
    champion_id: int,
    position: str | None = None,
    queue_ids: list[int] | None = None,
    tier: str | None = None,
    sample_limit: int = 500,
) -> dict | None:
    """
    이 챔피언을 플레이한 매치 기록들을 모아서, 스펠/룬/아이템/스킬 순서의
    "각 옵션별" 승률·픽률·게임 수를 집계한다 (op.gg 챔피언 분석 페이지와
    비슷한 개념). 표본이 우리 DB에 쌓인 매치로 한정되므로, 매치가 적으면
    신뢰도가 낮다.

    tier 예시:
    - "GOLD_PLUS" -> 골드 이상(골드/플래티넘/.../챌린저) 전부
    - "GOLD" -> 골드 정확히 그 구간만
    - "MASTER_PLUS" -> 마스터/그마/챌린저 전부, "MASTER" -> 마스터만(그마/챌린저 제외)
    - None 또는 "ALL" -> 필터 없음

    참가자별 tier_at_sync(그 매치를 DB에 처음 저장한 시점에 캐싱되어 있던
    티어를 고정해둔 값)를 기준으로 필터링한다 — 실제 매치 당시 티어는
    Riot API가 제공하지 않아 완벽히 같을 수는 없지만, 매번 "현재" 티어로
    조회하는 것보다는 실제 플레이 시점에 더 가깝다. 캐싱된 적 없는 참가자는
    tier_at_sync가 없어 필터에서 제외되므로, 필터를 걸수록 표본이 줄어든다.

    빌드 "경로"(아이템 구매 순서 조합)와 "시작 아이템"은 가격/타이밍 데이터가
    더 필요해 복잡도가 커서 이번 버전에는 포함하지 않았다 — 대신 아이템/룬
    하나하나의 개별 승률·픽률은 전부 계산한다.
    """

    query = select(MatchParticipant).where(MatchParticipant.champion_id == champion_id)
    if position:
        query = query.where(MatchParticipant.team_position == position)
    if queue_ids:
        query = query.join(Match, Match.id == MatchParticipant.match_id).where(
            Match.queue_id.in_(queue_ids)
        )
    if tier and tier.upper() != "ALL":
        tier_upper = tier.upper()
        is_plus = tier_upper.endswith("_PLUS")
        base_tier = tier_upper[: -len("_PLUS")] if is_plus else tier_upper
        if base_tier not in TIER_ORDER:
            raise ValueError(f"지원하지 않는 티어입니다: {tier}")
        target_rank = TIER_ORDER.index(base_tier)
        tier_rank_case = case(
            {t: i for i, t in enumerate(TIER_ORDER)},
            value=MatchParticipant.tier_at_sync,
            else_=-1,
        )
        if is_plus:
            query = query.where(tier_rank_case >= target_rank)
        else:
            query = query.where(tier_rank_case == target_rank)
    query = query.limit(sample_limit)

    rows = list((await db.execute(query)).scalars().all())
    if not rows:
        return None

    total_games = len(rows)
    wins = sum(1 for r in rows if r.win)
    name_map = await ddragon.get_champion_name_map()

    # {key: {"games": n, "wins": n}} 누적용 헬퍼
    def new_group() -> dict:
        return {"games": 0, "wins": 0}

    def add(groups: dict, key, win: bool) -> None:
        if key is None:
            return
        g = groups.setdefault(key, new_group())
        g["games"] += 1
        if win:
            g["wins"] += 1

    def to_stat_list(groups: dict, limit: int, key_to_ids) -> list[dict]:
        """groups를 게임 수 내림차순 정렬된 통계 리스트로 변환."""
        items = sorted(groups.items(), key=lambda kv: kv[1]["games"], reverse=True)[:limit]
        result = []
        for key, g in items:
            result.append(
                {
                    "item_ids": key_to_ids(key),
                    "games": g["games"],
                    "win_rate": round(g["wins"] / g["games"] * 100, 1) if g["games"] else 0.0,
                    "pick_rate": round(g["games"] / total_games * 100, 1),
                }
            )
        return result

    def compute_full_order(skill_order_lists: list[list[dict]]) -> list[str | None]:
        """참가자들의 전체 스킬 순서 목록에서, 레벨 1~18 각각 가장 많이 찍힌 스킬을 뽑는다."""
        level_counts: dict[int, dict[str, int]] = {}
        for skill_order in skill_order_lists:
            for entry in skill_order:
                level = entry.get("level")
                skill = entry.get("skill")
                if level is None or skill is None:
                    continue
                counter = level_counts.setdefault(level, {})
                counter[skill] = counter.get(skill, 0) + 1
        order: list[str | None] = []
        for level in range(1, 19):
            counts = level_counts.get(level)
            if not counts:
                order.append(None)
                continue
            order.append(max(counts.items(), key=lambda kv: kv[1])[0])
        return order

    rune_page_groups: dict = {}
    keystone_groups: dict = {}
    primary_slot1_groups: dict = {}
    primary_slot2_groups: dict = {}
    primary_slot3_groups: dict = {}
    secondary_rune_groups: dict = {}
    spell_groups: dict = {}
    skill_order_groups: dict = {}
    skill_order_group_rows: dict[tuple, list] = {}
    all_skill_order_lists: list = []
    boots_groups: dict = {}
    trinket_groups: dict = {}
    core_item_groups: dict = {}

    for r in rows:
        runes = r.runes or {}
        primary_style = runes.get("primary_style")
        sub_style = runes.get("sub_style")
        keystone = runes.get("keystone")

        add(rune_page_groups, (primary_style, sub_style), r.win)
        add(keystone_groups, keystone, r.win)

        # primary_runes = [키스톤, 슬롯1, 슬롯2, 슬롯3] 순서로 저장되어 있음
        primary_runes = runes.get("primary_runes", [])
        if len(primary_runes) > 1:
            add(primary_slot1_groups, primary_runes[1], r.win)
        if len(primary_runes) > 2:
            add(primary_slot2_groups, primary_runes[2], r.win)
        if len(primary_runes) > 3:
            add(primary_slot3_groups, primary_runes[3], r.win)

        for perk in runes.get("secondary_runes", []):
            add(secondary_rune_groups, perk, r.win)

        spell_pair = tuple(sorted([r.summoner1_id, r.summoner2_id]))
        if all(spell_pair):
            add(spell_groups, spell_pair, r.win)

        if r.skill_order:
            first_three = tuple(
                s["skill"] for s in sorted(r.skill_order, key=lambda s: s["level"])[:3]
            )
            if len(first_three) == 3:
                add(skill_order_groups, first_three, r.win)
                skill_order_group_rows.setdefault(first_three, []).append(r.skill_order)

            all_skill_order_lists.append(r.skill_order)

        for item_id in r.items[:6]:
            if not item_id:
                continue
            if ddragon.is_boots(item_id):
                add(boots_groups, item_id, r.win)
            else:
                add(core_item_groups, item_id, r.win)
        if r.items[6]:
            add(trinket_groups, r.items[6], r.win)

    rune_page_stats = to_stat_list(rune_page_groups, 3, lambda k: list(k))
    for stat in rune_page_stats:
        primary_id, sub_id = stat["item_ids"]
        stat["primary_style_icon_url"] = ddragon.rune_style_icon_url(primary_id)
        stat["sub_style_icon_url"] = ddragon.rune_style_icon_url(sub_id)

    keystone_stats = to_stat_list(keystone_groups, 6, lambda k: [k])
    for stat in keystone_stats:
        stat["icon_url"] = ddragon.rune_icon_url(stat["item_ids"][0])

    primary_slot1_stats = to_stat_list(primary_slot1_groups, 4, lambda k: [k])
    for stat in primary_slot1_stats:
        stat["icon_url"] = ddragon.rune_icon_url(stat["item_ids"][0])

    primary_slot2_stats = to_stat_list(primary_slot2_groups, 4, lambda k: [k])
    for stat in primary_slot2_stats:
        stat["icon_url"] = ddragon.rune_icon_url(stat["item_ids"][0])

    primary_slot3_stats = to_stat_list(primary_slot3_groups, 4, lambda k: [k])
    for stat in primary_slot3_stats:
        stat["icon_url"] = ddragon.rune_icon_url(stat["item_ids"][0])

    secondary_rune_stats = to_stat_list(secondary_rune_groups, 8, lambda k: [k])
    for stat in secondary_rune_stats:
        stat["icon_url"] = ddragon.rune_icon_url(stat["item_ids"][0])

    spell_stats = to_stat_list(spell_groups, 4, lambda k: list(k))
    for stat in spell_stats:
        stat["icon_urls"] = [ddragon.spell_icon_url(i) for i in stat["item_ids"]]

    skill_order_stats = to_stat_list(skill_order_groups, 4, lambda k: list(k))
    for stat in skill_order_stats:
        key = tuple(stat["item_ids"])
        stat["full_order"] = compute_full_order(skill_order_group_rows.get(key, []))

    # 전체 기준 기본 표시용 (특정 우선순위를 고르기 전 기본값)
    full_skill_order = compute_full_order(all_skill_order_lists)

    boots_stats = to_stat_list(boots_groups, 4, lambda k: [k])
    for stat in boots_stats:
        stat["icon_url"] = ddragon.item_icon_url(stat["item_ids"][0])

    trinket_stats = to_stat_list(trinket_groups, 4, lambda k: [k])
    for stat in trinket_stats:
        stat["icon_url"] = ddragon.item_icon_url(stat["item_ids"][0])

    core_item_stats = to_stat_list(core_item_groups, 10, lambda k: [k])
    for stat in core_item_stats:
        stat["icon_url"] = ddragon.item_icon_url(stat["item_ids"][0])

    return {
        "champion_id": champion_id,
        "champion_name": name_map.get(champion_id, f"챔피언 {champion_id}"),
        "champion_icon_url": ddragon.champion_icon_url(champion_id),
        "games": total_games,
        "win_rate": round(wins / total_games * 100, 1) if total_games else 0.0,
        "rune_page_stats": rune_page_stats,
        "keystone_stats": keystone_stats,
        "primary_slot1_stats": primary_slot1_stats,
        "primary_slot2_stats": primary_slot2_stats,
        "primary_slot3_stats": primary_slot3_stats,
        "secondary_rune_stats": secondary_rune_stats,
        "spell_stats": spell_stats,
        "skill_order_stats": skill_order_stats,
        "full_skill_order": full_skill_order,
        "boots_stats": boots_stats,
        "trinket_stats": trinket_stats,
        "core_item_stats": core_item_stats,
    }
