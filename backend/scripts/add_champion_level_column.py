"""
match_participants 테이블에 champion_level 컬럼을 추가한다.
(add_multikill_columns.py와 동일한 이유)

실행 방법 (backend 폴더에서, 가상환경 활성화 후):
    python scripts/add_champion_level_column.py
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
            text(
                "ALTER TABLE match_participants "
                "ADD COLUMN IF NOT EXISTS champion_level INTEGER NOT NULL DEFAULT 1"
            )
        )
        print("확인/추가 완료: match_participants.champion_level")

    print(
        "\n완료! 백엔드를 재시작한 뒤, 정확한 값을 보려면 "
        "scripts/clear_matches.py로 캐시를 지우고 다시 동기화하세요."
    )


if __name__ == "__main__":
    asyncio.run(main())
