from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ProPlayer(Base):
    """
    프로 관전 탭에 표시할 프로게이머 등록 목록.

    Riot API는 "이 계정은 프로게이머 계정이다"라는 데이터를 제공하지
    않으므로, 직접 등록/관리해야 한다 (scripts/seed_pro_players.py 참고).
    현재 백엔드는 RIOT_PLATFORM_REGION 하나만 바라보도록 되어 있어서
    (app/core/config.py), 그 지역(기본값 kr) 계정만 정상 동작한다.
    """

    __tablename__ = "pro_players"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    game_name: Mapped[str] = mapped_column(String(50))
    tag_line: Mapped[str] = mapped_column(String(10))
    real_name: Mapped[str] = mapped_column(String(50))
    team: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # 조회 시마다 계정 API를 부르지 않도록 puuid를 한 번 캐싱해둔다.
    puuid: Mapped[str | None] = mapped_column(String(78), nullable=True, index=True)
