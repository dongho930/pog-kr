import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import crud_pro_player, crud_summoner
from app.services import ddragon, riot_api

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pro-players", tags=["pro-players"])


@router.get("")
async def list_pro_players(db: AsyncSession = Depends(get_db)):
    """
    등록된 프로게이머 목록과 각자의 현재 게임 진행 상태.

    관전(spectate) 자체는 브라우저에서 바로 될 수 없다 — 실제 관전은 로컬
    League 클라이언트가 필요한 기능이라, 게임 중일 때 접속에 필요한 정보
    (gameId/platformId/encryptionKey)만 함께 내려준다. 정확한 클라이언트
    실행 커맨드는 클라이언트 버전에 따라 달라질 수 있어 프론트에서는
    "관전 정보"로만 안내한다.
    """
    players = await crud_pro_player.list_all(db)
    results = []

    for player in players:
        entry: dict = {
            "id": player.id,
            "game_name": player.game_name,
            "tag_line": player.tag_line,
            "real_name": player.real_name,
            "team": player.team,
            "in_game": False,
            "found": True,
        }

        puuid = player.puuid
        if puuid is None:
            try:
                account = await riot_api.get_account_by_riot_id(player.game_name, player.tag_line)
                puuid = account["puuid"]
                await crud_pro_player.set_puuid(db, player.id, puuid)
            except riot_api.RiotAPIError:
                entry["found"] = False
                results.append(entry)
                continue

        entry["puuid"] = puuid

        cached = await crud_summoner.get_by_puuid(db, puuid)
        if cached:
            entry["tier"] = cached.solo_tier
            entry["rank"] = cached.solo_rank
            entry["summoner_level"] = cached.summoner_level

        try:
            game = await riot_api.get_active_game(puuid)
        except riot_api.RiotAPIError:
            game = None

        if game is not None:
            entry["in_game"] = True
            entry["game_mode"] = game.get("gameMode")
            entry["game_length_seconds"] = game.get("gameLength")
            entry["participants"] = [
                {
                    "puuid": p["puuid"],
                    "champion_id": p["championId"],
                    "champion_icon_url": ddragon.champion_icon_url(p["championId"]),
                    "team_id": p["teamId"],
                    "game_name": p.get("riotId", "").split("#")[0],
                    "tag_line": p.get("riotId", "").split("#")[-1],
                }
                for p in game.get("participants", [])
            ]
            entry["spectate"] = {
                "game_id": game.get("gameId"),
                "platform_id": game.get("platformId"),
                "encryption_key": game.get("observers", {}).get("encryptionKey"),
            }

        results.append(entry)

    return results
