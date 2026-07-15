from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rank_history import RankSnapshot


async def record_snapshot(
    db: AsyncSession,
    puuid: str,
    queue: str,
    tier: str | None,
    rank: str | None,
    lp: int,
) -> None:
    """
    소환사가 조회될 때마다 호출한다. 오늘 날짜 기록이 이미 있으면 그 값을
    최신 값으로 덮어쓰고(하루 안에서는 마지막 조회 시점 값을 그날의 대표값으로
    본다), 없으면 새로 만든다. 티어 정보가 아예 없으면(언랭크) 기록하지 않는다.
    """
    if tier is None:
        return

    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(RankSnapshot).where(
            RankSnapshot.puuid == puuid,
            RankSnapshot.queue == queue,
            RankSnapshot.recorded_date == today,
        )
    )
    snapshot = result.scalar_one_or_none()

    if snapshot is None:
        db.add(
            RankSnapshot(
                puuid=puuid, queue=queue, tier=tier, rank=rank, lp=lp, recorded_date=today
            )
        )
    else:
        snapshot.tier = tier
        snapshot.rank = rank
        snapshot.lp = lp

    await db.commit()


async def get_history(
    db: AsyncSession, puuid: str, queue: str, since: date
) -> list[RankSnapshot]:
    result = await db.execute(
        select(RankSnapshot)
        .where(
            RankSnapshot.puuid == puuid,
            RankSnapshot.queue == queue,
            RankSnapshot.recorded_date >= since,
        )
        .order_by(RankSnapshot.recorded_date.asc())
    )
    return list(result.scalars().all())
