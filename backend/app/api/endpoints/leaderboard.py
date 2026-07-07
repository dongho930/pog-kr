import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.leaderboard import LeaderboardEntryOut
from app.services import leaderboard as leaderboard_service
from app.services import riot_api

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[LeaderboardEntryOut])
async def get_leaderboard(
    tier: str = Query(default="challenger", description="challenger | grandmaster | master"),
    queue: str = Query(default="RANKED_SOLO_5x5", description="RANKED_SOLO_5x5 | RANKED_FLEX_SR"),
    limit: int = Query(default=50, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    솔로랭크/자유랭크 챌린저·그랜드마스터·마스터 리더보드.
    이름 역조회 때문에 순위가 높을수록(=limit이 클수록) 응답이 느려질 수 있다.
    """
    try:
        return await leaderboard_service.get_leaderboard(db, tier, queue, limit)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    except riot_api.RiotAPIError as e:
        raise HTTPException(e.status_code, e.message) from e
    except Exception as e:
        logger.exception("리더보드 조회 중 예상하지 못한 오류")
        raise HTTPException(500, f"리더보드를 불러오는 중 오류가 발생했습니다: {e}") from e
