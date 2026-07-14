from pydantic import BaseModel


class ParticipantRankOut(BaseModel):
    puuid: str
    tier: str | None
    rank: str | None
    level: int | None
    game_name: str | None = None
    tag_line: str | None = None
