from fastapi import APIRouter

from app.api.endpoints import champion, leaderboard, live, match, patch_notes, pro_players, summoner

api_router = APIRouter(prefix="/api")
api_router.include_router(summoner.router)
api_router.include_router(match.router)
api_router.include_router(champion.router)
api_router.include_router(live.router)
api_router.include_router(leaderboard.router)
api_router.include_router(patch_notes.router)
api_router.include_router(pro_players.router)
