from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Match(Base):
    """매치 단위 메타데이터."""

    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    match_id: Mapped[str] = mapped_column(String(30), unique=True, index=True)  # e.g. KR_1234567890
    queue_id: Mapped[int] = mapped_column(Integer)
    game_duration: Mapped[int] = mapped_column(Integer)  # seconds
    game_creation: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    patch: Mapped[str] = mapped_column(String(10))  # e.g. "14.20"

    # 팀별 오브젝트: {"100": {"baron": 1, "dragon": 2, "tower": 5, "herald": 0, "inhibitor": 1}, "200": {...}}
    team_objectives: Mapped[dict] = mapped_column(JSON, default=dict)

    participants: Mapped[list["MatchParticipant"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class MatchParticipant(Base):
    """매치 참가자(=소환사 1명의 1경기 결과 + 빌드/스킬 타임라인)."""

    __tablename__ = "match_participants"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"))
    puuid: Mapped[str] = mapped_column(String(78), index=True)

    champion_id: Mapped[int] = mapped_column(Integer)
    team_position: Mapped[str] = mapped_column(String(10))  # TOP/JUNGLE/MID/BOTTOM/UTILITY
    team_id: Mapped[int] = mapped_column(Integer, default=100)  # 100(블루) / 200(레드)
    win: Mapped[bool] = mapped_column()

    game_name: Mapped[str] = mapped_column(String(50), default="")
    tag_line: Mapped[str] = mapped_column(String(10), default="")

    kills: Mapped[int] = mapped_column(Integer, default=0)
    deaths: Mapped[int] = mapped_column(Integer, default=0)
    assists: Mapped[int] = mapped_column(Integer, default=0)
    cs: Mapped[int] = mapped_column(Integer, default=0)
    gold_earned: Mapped[int] = mapped_column(Integer, default=0)
    champion_level: Mapped[int] = mapped_column(Integer, default=1)  # 이 매치에서의 챔피언 레벨(소환사 계정 레벨 아님)
    damage_dealt: Mapped[int] = mapped_column(Integer, default=0)  # 챔피언에게 가한 피해
    damage_taken: Mapped[int] = mapped_column(Integer, default=0)  # 받은 피해

    summoner1_id: Mapped[int] = mapped_column(Integer, default=0)  # 스펠1 (예: 점멸=4)
    summoner2_id: Mapped[int] = mapped_column(Integer, default=0)  # 스펠2
    vision_score: Mapped[int] = mapped_column(Integer, default=0)
    vision_wards_bought: Mapped[int] = mapped_column(Integer, default=0)  # 제어와드 구매 횟수

    double_kills: Mapped[int] = mapped_column(Integer, default=0)
    triple_kills: Mapped[int] = mapped_column(Integer, default=0)
    quadra_kills: Mapped[int] = mapped_column(Integer, default=0)
    penta_kills: Mapped[int] = mapped_column(Integer, default=0)

    # 아이템 최종 6슬롯 + 장신구
    items: Mapped[list[int]] = mapped_column(JSON, default=list)

    # 룬 통계: [{"style": "정밀", "primary": [...], "secondary": [...]}]
    runes: Mapped[dict] = mapped_column(JSON, default=dict)

    # 스킬 빌드 순서 타임라인: [{"level": 1, "skill": "Q", "timestamp": 65}, ...]
    skill_order: Mapped[list[dict]] = mapped_column(JSON, default=list)

    # 아이템 구매 타임라인: [{"item_id": 1055, "timestamp": 90}, ...]
    item_timeline: Mapped[list[dict]] = mapped_column(JSON, default=list)

    match: Mapped["Match"] = relationship(back_populates="participants")
