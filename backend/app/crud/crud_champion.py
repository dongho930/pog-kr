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
