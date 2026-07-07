from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import crud_champion
from app.schemas.champion import ChampionStatOut
from app.schemas.champion_build import ChampionBuildOut

router = APIRouter(prefix="/champions", tags=["champion"])


@router.get("", response_model=list[ChampionStatOut])
async def get_tier_list(
    patch: str | None = Query(default=None, description="예: 14.20 (생략하면 실시간 집계 사용)"),
    position: str | None = Query(default=None, description="TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY"),
    queue_ids: str | None = Query(
        default=None, description="쉼표로 구분된 queue id 목록 (예: 420,440 = 솔로+자유랭크)"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    챔피언 티어리스트. 배치로 채워지는 champion_stats 테이블에 해당 패치
    데이터가 있으면 그걸 쓰고, 없으면(=아직 배치를 안 돌렸다면) 지금까지
    수집된 실제 매치 데이터(match_participants)로 즉석 집계해서 보여준다.
    queue_ids를 넘기면 특정 게임 모드(예: 랭크만)로 필터링한다.
    """
    parsed_queue_ids = None
    if queue_ids:
        try:
            parsed_queue_ids = [int(q) for q in queue_ids.split(",") if q.strip()]
        except ValueError:
            raise HTTPException(400, "queue_ids는 쉼표로 구분된 숫자여야 합니다")

    if patch:
        stats = await crud_champion.get_tier_list(db, patch, position)
        if stats:
            return stats
    return await crud_champion.get_aggregated_stats(db, position, parsed_queue_ids)


@router.get("/by-summoner/{puuid}", response_model=list[ChampionStatOut])
async def get_champion_stats_by_summoner(
    puuid: str,
    queue_ids: str | None = Query(
        default=None, description="쉼표로 구분된 queue id 목록 (예: 420,440). 생략하면 전체 모드."
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    특정 소환사가 실제로 플레이한 챔피언 통계만 게임 수가 많은 순으로 반환한다.
    (전체 유저 대상 실시간 집계인 GET /champions 와는 다르다.)
    queue_ids를 넘기면 해당 게임 모드(소환사의 협곡/칼바람 나락/우르프 등)의
    매치만 집계한다.
    """
    parsed_queue_ids = None
    if queue_ids:
        try:
            parsed_queue_ids = [int(q) for q in queue_ids.split(",") if q.strip()]
        except ValueError:
            raise HTTPException(400, "queue_ids는 쉼표로 구분된 숫자여야 합니다")
    return await crud_champion.get_champion_stats_for_puuid(db, puuid, parsed_queue_ids)


@router.get("/{champion_id}", response_model=ChampionStatOut)
async def get_champion_detail(
    champion_id: int,
    patch: str = Query(..., description="예: 14.20"),
    db: AsyncSession = Depends(get_db),
):
    stat = await crud_champion.get_champion_detail(db, champion_id, patch)
    if stat is None:
        raise HTTPException(404, "해당 패치의 챔피언 통계가 없습니다")
    return stat


@router.get("/{champion_id}/build", response_model=ChampionBuildOut)
async def get_champion_build(
    champion_id: int,
    position: str | None = Query(default=None, description="TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY"),
    queue_ids: str | None = Query(
        default=None, description="쉼표로 구분된 queue id 목록 (예: 420,440 = 솔로+자유랭크)"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    이 챔피언의 추천 스펠/룬/아이템/스킬 순서 (우리 DB에 쌓인 매치 기준
    다수결 집계). op.gg 같은 "챔피언 분석" 페이지와 비슷한 개념이지만,
    표본이 pog.kr에서 실제로 수집된 매치로 한정된다.
    """
    parsed_queue_ids = None
    if queue_ids:
        try:
            parsed_queue_ids = [int(q) for q in queue_ids.split(",") if q.strip()]
        except ValueError:
            raise HTTPException(400, "queue_ids는 쉼표로 구분된 숫자여야 합니다")

    build = await crud_champion.get_champion_build(db, champion_id, position, parsed_queue_ids)
    if build is None:
        raise HTTPException(404, "아직 이 챔피언의 매치 데이터가 없습니다")
    return build
