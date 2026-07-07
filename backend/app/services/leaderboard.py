"""
챌린저/그랜드마스터/마스터 리더보드 조회.

League-V4 챌린저/GM/마스터 엔드포인트는 puuid만 줄 뿐 소환사 이름은 주지
않으므로, Account-V1(by-puuid)로 이름을 역조회해야 한다. 매번 새로 조회하면
너무 느리고 rate limit에도 부담이 되므로, 한 번 조회한 이름은 summoners
테이블에 캐싱해서 다음부터는 재사용한다 (crud_summoner.cache_name_only).

NOTE: DB 세션은 동시 요청에 안전하지 않으므로(SQLAlchemy AsyncSession은
단일 커넥션을 감싸는 구조), 이름 조회는 asyncio.gather로 병렬 처리하지
않고 순차적으로 처리한다.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import crud_summoner
from app.services import riot_api

TIER_LABEL = {"CHALLENGER": "챌린저", "GRANDMASTER": "그랜드마스터", "MASTER": "마스터"}


async def get_leaderboard(
    db: AsyncSession, tier: str, queue: str, limit: int = 50
) -> list[dict]:
    tier_upper = tier.upper()
    if tier_upper == "CHALLENGER":
        league = await riot_api.get_challenger_league(queue)
    elif tier_upper == "GRANDMASTER":
        league = await riot_api.get_grandmaster_league(queue)
    elif tier_upper == "MASTER":
        league = await riot_api.get_master_league(queue)
    else:
        raise ValueError(f"지원하지 않는 티어입니다: {tier}")

    entries = sorted(
        league.get("entries", []), key=lambda e: e.get("leaguePoints", 0), reverse=True
    )[:limit]

    results: list[dict] = []
    for i, entry in enumerate(entries):
        puuid = entry.get("puuid")
        game_name, tag_line = "", ""

        if puuid:
            cached = await crud_summoner.get_by_puuid(db, puuid)
            if cached and cached.game_name:
                game_name, tag_line = cached.game_name, cached.tag_line
            else:
                try:
                    account = await riot_api.get_account_by_puuid(puuid)
                    game_name = account.get("gameName", "")
                    tag_line = account.get("tagLine", "")
                    if game_name:
                        await crud_summoner.cache_name_only(db, puuid, game_name, tag_line, "kr")
                except riot_api.RiotAPIError:
                    pass  # 이름 조회 실패해도 순위/LP 정보는 그대로 보여준다

        wins = entry.get("wins", 0)
        losses = entry.get("losses", 0)
        total = wins + losses

        results.append(
            {
                "rank": i + 1,
                "puuid": puuid or "",
                "game_name": game_name or "(이름 조회 실패)",
                "tag_line": tag_line,
                "tier": TIER_LABEL.get(tier_upper, tier_upper),
                "lp": entry.get("leaguePoints", 0),
                "wins": wins,
                "losses": losses,
                "win_rate": round(wins / total * 100, 1) if total else 0.0,
            }
        )

    return results
