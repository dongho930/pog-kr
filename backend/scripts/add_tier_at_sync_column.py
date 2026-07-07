"""
match_participants 테이블에 tier_at_sync 컬럼을 추가한다.
(add_multikill_columns.py와 동일한 이유)

실행 방법 (backend 폴더에서, 가상환경 활성화 후):
    python scripts/add_tier_at_sync_column.py
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
                "ADD COLUMN IF NOT EXISTS tier_at_sync VARCHAR(20)"
            )
        )
        print("확인/추가 완료: match_participants.tier_at_sync")

    print(
        "\n완료! 백엔드를 재시작하세요. 이 컬럼은 앞으로 새로 저장되는 매치부터 "
        "채워지기 시작합니다 (기존 매치는 비어있는 채로 유지되며, 원하면 "
        "scripts/clear_matches.py로 캐시를 지우고 다시 받으면 더 많이 채워집니다)."
    )


if __name__ == "__main__":
    asyncio.run(main())
