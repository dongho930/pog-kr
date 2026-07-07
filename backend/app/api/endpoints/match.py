import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import crud_match, crud_summoner
from app.schemas.match import MatchOut
from app.schemas.rank import ParticipantRankOut
from app.services import riot_api
from app.services.match_sync import sync_recent_matches

logger = logging.getLogger(__name__)

router = APIRouter(tags=["match"])


@router.get("/summoners/{puuid}/matches", response_model=list[MatchOut])
async def get_match_history(
    puuid: str,
    count: int = Query(default=20, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    매치 히스토리. 조회 시점에 Riot API에서 최신 경기를 동기화한 뒤 DB를
    반환한다 (자세한 내용은 app/services/match_sync.py 참고 — 사용자가
    늘어나면 배치/워커 방식으로 옮기는 것을 권장).
    """
    try:
        await sync_recent_matches(db, puuid, count=count)
    except riot_api.RiotAPIError as e:
        logger.warning("매치 동기화 실패 (puuid=%s): [%s] %s", puuid, e.status_code, e.message)
        existing = await crud_match.get_match_history(db, puuid, count, offset)
        if not existing:
            hint = (
                " Riot API 요청 제한(rate limit)에 걸렸을 가능성이 높습니다. "
                "잠시 후 다시 시도해주세요."
                if e.status_code == 429
                else ""
            )
            raise HTTPException(
                status_code=502,
                detail=f"Riot API에서 매치 데이터를 가져오지 못했습니다 ({e.status_code}: {e.message}).{hint}",
            ) from e
        return existing
    except Exception as e:
        # RiotAPIError가 아닌 예외(대부분 DB 스키마 불일치)는 원인을 숨기지 않고
        # 그대로 알려준다. 특히 모델에 컬럼을 추가했는데 기존 테이블을 갱신하지
        # 않은 경우(마이그레이션 도구가 없어서) 여기서 잡힌다.
        logger.exception("매치 동기화 중 예상하지 못한 오류 (puuid=%s)", puuid)
        raise HTTPException(
            status_code=500,
            detail=(
                f"매치 동기화 중 오류가 발생했습니다: {e}. "
                "모델에 새 컬럼을 추가한 뒤 기존 DB 테이블을 갱신하지 않았다면, "
                "matches / match_participants 테이블을 DROP한 뒤 백엔드를 재시작해보세요."
            ),
        ) from e

    matches = await crud_match.get_match_history(db, puuid, count, offset)
    return matches


@router.get("/matches/{match_id}", response_model=MatchOut)
async def get_match_detail(match_id: str, db: AsyncSession = Depends(get_db)):
    """매치 상세 — 아이템/스킬 빌드 타임라인, 룬 통계 포함."""
    match = await crud_match.get_match_by_id(db, match_id)
    if match is None:
        raise HTTPException(404, "매치를 찾을 수 없습니다")
    return match


@router.get("/matches/{match_id}/ranks", response_model=list[ParticipantRankOut])
async def get_match_participant_ranks(match_id: str, db: AsyncSession = Depends(get_db)):
    """
    매치 참가자 10명 전원의 솔로랭크 티어/레벨을 조회한다. 이미 전체 정보로
    검색된 적 있는 소환사는 DB 캐시를 그대로 쓰고, 없는 경우에만 Riot API를
    호출한 뒤 caching한다 (요청당 최대 참가자 수만큼 추가 호출 발생 — 느릴 수
    있음을 프론트에서 안내하는 것을 권장).
    """
    match = await crud_match.get_match_by_id(db, match_id)
    if match is None:
        raise HTTPException(404, "매치를 찾을 수 없습니다")

    results: list[dict] = []
    for p in match.participants:
        cached = await crud_summoner.get_by_puuid(db, p.puuid)
        if cached and cached.solo_tier is not None:
            results.append(
                {"puuid": p.puuid, "tier": cached.solo_tier, "rank": cached.solo_rank, "level": cached.summoner_level}
            )
            continue

        try:
            summoner_info = await riot_api.get_summoner_by_puuid(p.puuid)
            league_entries = await riot_api.get_league_entries(p.puuid)
        except riot_api.RiotAPIError:
            results.append({"puuid": p.puuid, "tier": None, "rank": None, "level": None})
            continue

        solo = next(
            (entry for entry in league_entries if entry.get("queueType") == "RANKED_SOLO_5x5"),
            None,
        )
        data = {
            "puuid": p.puuid,
            "game_name": p.game_name or (cached.game_name if cached else ""),
            "tag_line": p.tag_line or (cached.tag_line if cached else ""),
            "platform_region": "kr",
            "profile_icon_id": summoner_info.get("profileIconId", 0),
            "summoner_level": summoner_info.get("summonerLevel", 1),
            "solo_tier": solo["tier"] if solo else None,
            "solo_rank": solo["rank"] if solo else None,
            "solo_lp": solo["leaguePoints"] if solo else 0,
            "solo_wins": solo["wins"] if solo else 0,
            "solo_losses": solo["losses"] if solo else 0,
        }
        summoner = await crud_summoner.upsert_summoner(db, data)
        results.append(
            {
                "puuid": p.puuid,
                "tier": summoner.solo_tier,
                "rank": summoner.solo_rank,
                "level": summoner.summoner_level,
            }
        )

    return results
