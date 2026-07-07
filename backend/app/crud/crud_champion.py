from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.champion import ChampionStat
from app.models.match import Match, MatchParticipant
from app.services import ddragon


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


async def get_champion_build(
    db: AsyncSession,
    champion_id: int,
    position: str | None = None,
    queue_ids: list[int] | None = None,
    sample_limit: int = 300,
) -> dict | None:
    """
    이 챔피언을 플레이한 매치 기록들을 모아서 가장 많이 쓰인 스펠/룬/아이템/
    스킬 순서를 집계한다 (다수결 방식 — op.gg의 "추천 빌드"와 비슷한 개념).
    표본이 우리 DB에 쌓인 매치로 한정되므로, 매치가 적으면 신뢰도가 낮다.
    """
    from collections import Counter

    query = select(MatchParticipant).where(MatchParticipant.champion_id == champion_id)
    if position:
        query = query.where(MatchParticipant.team_position == position)
    if queue_ids:
        query = query.join(Match, Match.id == MatchParticipant.match_id).where(
            Match.queue_id.in_(queue_ids)
        )
    query = query.limit(sample_limit)

    rows = list((await db.execute(query)).scalars().all())
    if not rows:
        return None

    games = len(rows)
    wins = sum(1 for r in rows if r.win)

    core_item_counter: Counter[int] = Counter()
    boots_counter: Counter[int] = Counter()
    trinket_counter: Counter[int] = Counter()
    keystone_counter: Counter[int] = Counter()
    primary_style_counter: Counter[int] = Counter()
    sub_style_counter: Counter[int] = Counter()
    primary_minor_counter: Counter[int] = Counter()
    secondary_rune_counter: Counter[int] = Counter()
    spell_pair_counter: Counter[tuple[int, int]] = Counter()
    skill_priority_counter: Counter[tuple[str, ...]] = Counter()

    for r in rows:
        for item_id in r.items[:6]:
            if not item_id:
                continue
            if ddragon.is_boots(item_id):
                boots_counter[item_id] += 1
            else:
                core_item_counter[item_id] += 1
        if r.items[6]:
            trinket_counter[r.items[6]] += 1

        runes = r.runes or {}
        if runes.get("keystone"):
            keystone_counter[runes["keystone"]] += 1
        if runes.get("primary_style"):
            primary_style_counter[runes["primary_style"]] += 1
        if runes.get("sub_style"):
            sub_style_counter[runes["sub_style"]] += 1
        for perk in runes.get("primary_runes", [])[1:]:
            primary_minor_counter[perk] += 1
        for perk in runes.get("secondary_runes", []):
            secondary_rune_counter[perk] += 1

        spell_pair = tuple(sorted([r.summoner1_id, r.summoner2_id]))
        if all(spell_pair):
            spell_pair_counter[spell_pair] += 1

        if r.skill_order:
            first_three = tuple(
                s["skill"] for s in sorted(r.skill_order, key=lambda s: s["level"])[:3]
            )
            if len(first_three) == 3:
                skill_priority_counter[first_three] += 1

    def top_ids(counter: Counter[int], n: int) -> list[int]:
        return [item for item, _ in counter.most_common(n)]

    name_map = await ddragon.get_champion_name_map()
    top_spells = spell_pair_counter.most_common(1)
    top_skills = skill_priority_counter.most_common(1)

    return {
        "champion_id": champion_id,
        "champion_name": name_map.get(champion_id, f"챔피언 {champion_id}"),
        "games": games,
        "win_rate": round(wins / games * 100, 1) if games else 0.0,
        "core_item_ids": top_ids(core_item_counter, 6),
        "boots_item_id": top_ids(boots_counter, 1)[0] if boots_counter else None,
        "trinket_item_id": top_ids(trinket_counter, 1)[0] if trinket_counter else None,
        "keystone_id": top_ids(keystone_counter, 1)[0] if keystone_counter else None,
        "primary_style_id": top_ids(primary_style_counter, 1)[0] if primary_style_counter else None,
        "sub_style_id": top_ids(sub_style_counter, 1)[0] if sub_style_counter else None,
        "primary_minor_rune_ids": top_ids(primary_minor_counter, 3),
        "secondary_rune_ids": top_ids(secondary_rune_counter, 2),
        "spell_ids": list(top_spells[0][0]) if top_spells else [],
        "skill_priority": list(top_skills[0][0]) if top_skills else [],
    }
