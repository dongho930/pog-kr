"""
matches 테이블에 team_objectives, match_participants 테이블에 damage_dealt/
damage_taken 컬럼을 추가한다. add_multikill_columns.py와 동일한 이유로 필요.

실행 방법 (backend 폴더에서, 가상환경 활성화 후):
    python scripts/add_match_detail_columns.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import engine  # noqa: E402


def _masked_url() -> str:
    url = settings.DATABASE_URL
    if "@" in url and "://" in url:
        scheme, rest = url.split("://", 1)
        creds, host_part = rest.split("@", 1)
        user = creds.split(":")[0]
        return f"{scheme}://{user}:****@{host_part}"
    return url


async def main() -> None:
    print(f"연결 대상 DB: {_masked_url()}\n")
    async with engine.begin() as conn:
        await conn.execute(
            text("ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_objectives JSON NOT NULL DEFAULT '{}'")
        )
        print("확인/추가 완료: matches.team_objectives")

        await conn.execute(
            text("ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS damage_dealt INTEGER NOT NULL DEFAULT 0")
        )
        print("확인/추가 완료: match_participants.damage_dealt")

        await conn.execute(
            text("ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS damage_taken INTEGER NOT NULL DEFAULT 0")
        )
        print("확인/추가 완료: match_participants.damage_taken")

        await conn.execute(
            text("ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS game_name VARCHAR(50) NOT NULL DEFAULT ''")
        )
        print("확인/추가 완료: match_participants.game_name")

        await conn.execute(
            text("ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS tag_line VARCHAR(10) NOT NULL DEFAULT ''")
        )
        print("확인/추가 완료: match_participants.tag_line")

    print(
        "\n완료! 백엔드를 재시작한 뒤, 정확한 값을 보려면 "
        "scripts/clear_matches.py로 캐시를 지우고 다시 동기화하세요."
    )


if __name__ == "__main__":
    asyncio.run(main())
