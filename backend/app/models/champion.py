from sqlalchemy import BigInteger, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ChampionStat(Base):
    """패치 버전 + 포지션 단위로 집계된 챔피언 통계 (배치 작업으로 갱신)."""

    __tablename__ = "champion_stats"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    champion_id: Mapped[int] = mapped_column(Integer, index=True)
    champion_name: Mapped[str] = mapped_column(String(30))
    patch: Mapped[str] = mapped_column(String(10), index=True)
    position: Mapped[str] = mapped_column(String(10), index=True)  # TOP/JUNGLE/MID/BOTTOM/UTILITY
    tier_queue: Mapped[str] = mapped_column(String(20), default="RANKED_SOLO_5x5")

    tier: Mapped[str] = mapped_column(String(2))       # S+, S, A, B, C, D
    win_rate: Mapped[float] = mapped_column(Float)
    pick_rate: Mapped[float] = mapped_column(Float)
    ban_rate: Mapped[float] = mapped_column(Float)
    sample_size: Mapped[int] = mapped_column(Integer)  # 집계된 표본 게임 수
