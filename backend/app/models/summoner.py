from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Summoner(Base):
    __tablename__ = "summoners"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    puuid: Mapped[str] = mapped_column(String(78), unique=True, index=True)
    game_name: Mapped[str] = mapped_column(String(50), index=True)
    tag_line: Mapped[str] = mapped_column(String(10), index=True)
    platform_region: Mapped[str] = mapped_column(String(10), default="kr")

    profile_icon_id: Mapped[int] = mapped_column(Integer, default=0)
    summoner_level: Mapped[int] = mapped_column(Integer, default=1)

    solo_tier: Mapped[str | None] = mapped_column(String(20), nullable=True)
    solo_rank: Mapped[str | None] = mapped_column(String(5), nullable=True)
    solo_lp: Mapped[int] = mapped_column(Integer, default=0)
    solo_wins: Mapped[int] = mapped_column(Integer, default=0)
    solo_losses: Mapped[int] = mapped_column(Integer, default=0)

    flex_tier: Mapped[str | None] = mapped_column(String(20), nullable=True)
    flex_rank: Mapped[str | None] = mapped_column(String(5), nullable=True)
    flex_lp: Mapped[int] = mapped_column(Integer, default=0)
    flex_wins: Mapped[int] = mapped_column(Integer, default=0)
    flex_losses: Mapped[int] = mapped_column(Integer, default=0)

    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
