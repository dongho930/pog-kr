"""
summoners 테이블에 자유랭크(flex) 관련 컬럼을 추가한다.
(add_tier_at_sync_column.py와 동일한 이유 — 마이그레이션 도구가 없어서
모델에 컬럼을 추가했을 때 기존 테이블에는 수동으로 반영해야 한다.)

실행 방법 (backend 폴더에서, 가상환경 활성화 후):
    python scripts/add_flex_rank_columns.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402

from app.core.database import engine  # noqa: E402


async def main() -> None:
    async with engine.begin() as conn:
        await conn.execute(
            text("ALTER TABLE summoners ADD COLUMN IF NOT EXISTS flex_tier VARCHAR(20)")
        )
        await conn.execute(
            text("ALTER TABLE summoners ADD COLUMN IF NOT EXISTS flex_rank VARCHAR(5)")
        )
        await conn.execute(
            text(
                "ALTER TABLE summoners ADD COLUMN IF NOT EXISTS flex_lp INTEGER NOT NULL DEFAULT 0"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE summoners ADD COLUMN IF NOT EXISTS flex_wins INTEGER NOT NULL DEFAULT 0"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE summoners ADD COLUMN IF NOT EXISTS flex_losses INTEGER NOT NULL DEFAULT 0"
            )
        )
        print("확인/추가 완료: summoners.flex_tier / flex_rank / flex_lp / flex_wins / flex_losses")

    print("\n완료! 백엔드를 재시작하세요.")


if __name__ == "__main__":
    asyncio.run(main())
