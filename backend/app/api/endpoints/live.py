from fastapi import APIRouter, HTTPException

from app.schemas.match import LiveGameOut, LiveGameParticipant
from app.services import riot_api

router = APIRouter(tags=["live"])


@router.get("/summoners/{puuid}/live", response_model=LiveGameOut)
async def get_live_game(puuid: str):
    """실시간 전적(현재 게임 진행 중인지 + 참가자 정보)."""
    try:
        game = await riot_api.get_active_game(puuid)
    except riot_api.RiotAPIError as e:
        raise HTTPException(e.status_code, e.message) from e

    if game is None:
        return LiveGameOut(in_game=False)

    participants = [
        LiveGameParticipant(
            puuid=p["puuid"],
            game_name=p.get("riotId", "").split("#")[0],
            tag_line=p.get("riotId", "").split("#")[-1],
            champion_id=p["championId"],
            team_id=p["teamId"],
        )
        for p in game.get("participants", [])
    ]

    return LiveGameOut(
        in_game=True,
        game_mode=game.get("gameMode"),
        game_length_seconds=game.get("gameLength"),
        participants=participants,
    )
