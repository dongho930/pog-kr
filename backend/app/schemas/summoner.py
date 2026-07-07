from pydantic import BaseModel, ConfigDict, computed_field

from app.services import ddragon


class SummonerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    puuid: str
    game_name: str
    tag_line: str
    platform_region: str
    profile_icon_id: int
    summoner_level: int

    solo_tier: str | None
    solo_rank: str | None
    solo_lp: int
    solo_wins: int
    solo_losses: int

    @computed_field
    @property
    def profile_icon_url(self) -> str:
        return ddragon.profile_icon_url(self.profile_icon_id)

    @property
    def solo_win_rate(self) -> float:
        total = self.solo_wins + self.solo_losses
        return round(self.solo_wins / total * 100, 1) if total else 0.0
