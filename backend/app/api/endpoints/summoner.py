import logging
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import crud_rank_history, crud_summoner
from app.schemas.summoner import SummonerOut
from app.services import riot_api
from app.services.rank_score import rank_to_score

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/summoners", tags=["summoner"])


@router.get("/by-puuid/{puuid}/riot-id")
async def resolve_riot_id_by_puuid(puuid: str, db: AsyncSession = Depends(get_db)):
    """
    puuid로 현재 게임명#태그를 역조회한다. 오래된 매치 기록은 Riot API가
    riotIdGameName/riotIdTagLine을 안 준 경우가 있어(예: 태그가 빈
    문자열), 그럴 때 프론트에서 이 엔드포인트로 최신 Riot ID를 받아와
    소환사 프로필로 이동한다.

    주의: 이 경로는 아래 "/{platform_region}/{game_name}/{tag_line}"와
    경로 세그먼트 수가 같아서, 반드시 그 라우트보다 먼저 등록되어야 한다
    (안 그러면 by-puuid가 platform_region으로 잘못 매칭됨).
    """
    cached = await crud_summoner.get_by_puuid(db, puuid)
    if cached and cached.game_name and cached.tag_line:
        return {"game_name": cached.game_name, "tag_line": cached.tag_line}

    try:
        account = await riot_api.get_account_by_puuid(puuid)
    except riot_api.RiotAPIError as e:
        if e.status_code == 404:
            raise HTTPException(404, "라이엇 계정 정보를 찾을 수 없어요") from e
        raise HTTPException(e.status_code, e.message) from e

    game_name = account.get("gameName", "")
    tag_line = account.get("tagLine", "")
    if not game_name or not tag_line:
        raise HTTPException(404, "라이엇 계정 정보를 찾을 수 없어요")

    await crud_summoner.cache_name_only(db, puuid, game_name, tag_line, "kr")
    return {"game_name": game_name, "tag_line": tag_line}


@router.get("/{platform_region}/{game_name}/{tag_line}", response_model=SummonerOut)
async def get_summoner(
    platform_region: str,
    game_name: str,
    tag_line: str,
    db: AsyncSession = Depends(get_db),
):
    """
    소환사 검색 (예: /summoners/kr/Hide on bush/KR1).
    DB 캐시가 없거나 오래됐으면 Riot API에서 새로 조회 후 upsert 한다.
    """
    try:
        account = await riot_api.get_account_by_riot_id(game_name, tag_line)
        summoner_info = await riot_api.get_summoner_by_puuid(account["puuid"])
        league_entries = await riot_api.get_league_entries(account["puuid"])
    except riot_api.RiotAPIError as e:
        if e.status_code == 404:
            raise HTTPException(404, "존재하지 않는 소환사입니다") from e
        raise HTTPException(e.status_code, e.message) from e

    solo = next(
        (entry for entry in league_entries if entry.get("queueType") == "RANKED_SOLO_5x5"),
        None,
    )
    flex = next(
        (entry for entry in league_entries if entry.get("queueType") == "RANKED_FLEX_SR"),
        None,
    )

    data = {
        "puuid": account["puuid"],
        "game_name": account["gameName"],
        "tag_line": account["tagLine"],
        "platform_region": platform_region,
        "profile_icon_id": summoner_info.get("profileIconId", 0),
        "summoner_level": summoner_info.get("summonerLevel", 1),
        "solo_tier": solo["tier"] if solo else None,
        "solo_rank": solo["rank"] if solo else None,
        "solo_lp": solo["leaguePoints"] if solo else 0,
        "solo_wins": solo["wins"] if solo else 0,
        "solo_losses": solo["losses"] if solo else 0,
        "flex_tier": flex["tier"] if flex else None,
        "flex_rank": flex["rank"] if flex else None,
        "flex_lp": flex["leaguePoints"] if flex else 0,
        "flex_wins": flex["wins"] if flex else 0,
        "flex_losses": flex["losses"] if flex else 0,
    }

    try:
        summoner = await crud_summoner.upsert_summoner(db, data)
    except Exception as e:
        # RiotAPIError가 아닌 예외(DB 스키마 불일치 등)는 원인을 숨기지 않는다.
        logger.exception("소환사 저장 중 예상하지 못한 오류 (game_name=%s)", game_name)
        raise HTTPException(500, f"소환사 정보를 저장하는 중 오류가 발생했습니다: {e}") from e

    # 티어 변화 그래프용 오늘자 스냅샷 기록 (실패해도 소환사 조회 자체는 계속 진행).
    try:
        await crud_rank_history.record_snapshot(
            db, summoner.puuid, "solo", data["solo_tier"], data["solo_rank"], data["solo_lp"]
        )
        await crud_rank_history.record_snapshot(
            db, summoner.puuid, "flex", data["flex_tier"], data["flex_rank"], data["flex_lp"]
        )
    except Exception:
        logger.exception("랭크 스냅샷 기록 실패 (puuid=%s)", summoner.puuid)

    return summoner


@router.get("/{puuid}/rank-history")
async def get_rank_history(
    puuid: str,
    queue: str = Query(default="solo", pattern="^(solo|flex)$"),
    days: int = Query(default=60, le=365),
    db: AsyncSession = Depends(get_db),
):
    """
    티어 변화 그래프용 데이터. Riot API가 과거 랭크 기록을 주지 않기 때문에,
    이 소환사가 조회될 때마다(get_summoner) 하루 1개씩 우리가 직접 쌓아온
    스냅샷만 반환한다 — 그래서 기능을 막 켠 시점에는 비어있거나 점이
    거의 없을 수 있다 (앞으로 조회될 때마다 점이 쌓인다).
    """
    since = date.today() - timedelta(days=days)
    snapshots = await crud_rank_history.get_history(db, puuid, queue, since)
    return [
        {
            "date": s.recorded_date.isoformat(),
            "tier": s.tier,
            "rank": s.rank,
            "lp": s.lp,
            "score": rank_to_score(s.tier, s.rank, s.lp),
        }
        for s in snapshots
    ]
