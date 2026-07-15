from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RankSnapshot(Base):
    """
    소환사 조회 시점의 티어/LP 스냅샷. Riot API는 과거 랭크 기록을 제공하지
    않기 때문에, 우리가 직접 하루 1개씩 쌓아가는 방식으로만 "티어 변화
    그래프"를 만들 수 있다 (crud_rank_history.record_snapshot 참고).
    """

    __tablename__ = "rank_snapshots"
    __table_args__ = (
        UniqueConstraint("puuid", "queue", "recorded_date", name="uq_rank_snapshot_puuid_queue_date"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    puuid: Mapped[str] = mapped_column(String(78), index=True)
    queue: Mapped[str] = mapped_column(String(10), default="solo")  # "solo" | "flex"

    tier: Mapped[str | None] = mapped_column(String(20), nullable=True)
    rank: Mapped[str | None] = mapped_column(String(5), nullable=True)
    lp: Mapped[int] = mapped_column(Integer, default=0)

    recorded_date: Mapped[date] = mapped_column(Date, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
