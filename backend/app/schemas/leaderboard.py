from pydantic import BaseModel


class LeaderboardEntryOut(BaseModel):
    rank: int
    puuid: str
    game_name: str
    tag_line: str
    tier: str
    lp: int
    wins: int
    losses: int
    win_rate: float
