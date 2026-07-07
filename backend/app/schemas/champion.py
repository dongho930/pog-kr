from pydantic import BaseModel, ConfigDict, computed_field

from app.services import ddragon


class ChampionStatOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    champion_id: int
    champion_name: str
    patch: str
    position: str
    tier: str
    win_rate: float
    pick_rate: float
    ban_rate: float
    sample_size: int

    # 소환사별 상세 통계 (전체 유저 실시간 집계 엔드포인트에서는 기본값 0)
    games: int = 0
    wins: int = 0
    losses: int = 0
    kda: float = 0.0
    kills: float = 0.0
    deaths: float = 0.0
    assists: float = 0.0
    cs: float = 0.0
    cs_per_min: float = 0.0
    double_kills: int = 0
    triple_kills: int = 0
    quadra_kills: int = 0
    penta_kills: int = 0

    @computed_field
    @property
    def champion_icon_url(self) -> str:
        return ddragon.champion_icon_url(self.champion_id)


class ChampionSummaryOut(BaseModel):
    """챔피언 검색/선택 사이드바용 최소 정보."""

    champion_id: int
    champion_name: str
    champion_icon_url: str
    positions: list[str] = []  # 우리 DB에 기록된 실제 플레이 포지션 (없으면 빈 리스트)
