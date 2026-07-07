import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.database import close_db, init_db
from app.services import ddragon

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 앱 시작 시 pool을 명시적으로 워밍업 — 여기서 실패하면 요청이 들어오기
    # 전에 바로 에러가 드러나므로, 첫 요청에서야 asyncpg pool 문제를
    # 마주치는 상황을 피할 수 있다.
    await init_db()
    # 아이콘 URL에 사용할 최신 Data Dragon 패치 버전을 먼저 캐싱한 뒤,
    # 그 버전 기준으로 스펠/룬 아이콘 매핑도 캐싱한다 (순서 중요).
    await ddragon.refresh_latest_version()
    await ddragon.refresh_spell_icons()
    await ddragon.refresh_rune_icons()
    await ddragon.refresh_item_tags()
    yield
    await close_db()


app = FastAPI(title="pog.kr API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_origin_regex=settings.FRONTEND_ORIGIN_REGEX or None,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
