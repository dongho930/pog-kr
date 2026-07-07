from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


# NOTE:
# create_async_engine() 자체는 커넥션을 즉시 맺지 않는다 (lazy).
# 실제 asyncpg pool은 첫 쿼리 시점 혹은 FastAPI startup 이벤트에서
# 명시적으로 초기화되도록 구성한다. Windows 환경에서 이벤트루프 정책
# (ProactorEventLoop) 때문에 pool 초기화가 앱 시작 직후 실패하는 경우가
# 있으므로, main.py의 lifespan에서 engine.connect()를 한 번 호출해
# 문제를 조기에 드러내는 방식을 권장한다.
#
# statement_cache_size=0: Supabase의 "Transaction" 풀러(PgBouncer)를 쓰면
# 커넥션이 쿼리마다 재사용되므로 asyncpg의 prepared statement 캐시가 깨질 수
# 있다. 직접 연결(Session/Direct)에서는 없어도 무방하지만, 풀러로 바꿔도
# 바로 동작하도록 기본으로 꺼둔다 (성능 영향은 이 프로젝트 규모에서 미미).
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_pre_ping=True,   # 죽은 커넥션 자동 감지
    connect_args={"statement_cache_size": 0},
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI Depends()로 주입되는 세션."""
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    """앱 시작 시 테이블 생성 + pool 워밍업 (개발용, 운영은 Alembic 권장)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    await engine.dispose()
