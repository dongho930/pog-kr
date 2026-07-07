from fastapi import APIRouter

from app.api.endpoints import champion, leaderboard, live, match, summoner

api_router = APIRouter(prefix="/api")
api_router.include_router(summoner.router)
api_router.include_router(match.router)
api_router.include_router(champion.router)
api_router.include_router(live.router)
api_router.include_router(leaderboard.router)
