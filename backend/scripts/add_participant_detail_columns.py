"""
기존 match_participants 테이블에 team_id, summoner1_id, summoner2_id,
vision_score, vision_wards_bought 컬럼을 추가한다.

add_multikill_columns.py와 동일한 이유로 필요하다 (Alembic 없이 create_all만
쓰기 때문에 모델에 컬럼을 추가해도 기존 테이블은 자동으로 갱신되지 않음).
ADD COLUMN IF NOT EXISTS라 여러 번 실행해도 안전하고 기존 데이터도 지워지지
않는다.

주의: 이미 캐시된 매치는 이 컬럼이 생기기 전에 저장된 것이라 기본값만
채워진다. 실제 값을 채우려면 scripts/clear_matches.py로 캐시를 지우고
다시 동기화해야 한다.

실행 방법 (backend 폴더에서, 가상환경 활성화 후):
    python scripts/add_participant_detail_columns.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import engine  # noqa: E402

NEW_COLUMNS = [
    ("team_id", "INTEGER NOT NULL DEFAULT 100"),
    ("summoner1_id", "INTEGER NOT NULL DEFAULT 0"),
    ("summoner2_id", "INTEGER NOT NULL DEFAULT 0"),
    ("vision_score", "INTEGER NOT NULL DEFAULT 0"),
    ("vision_wards_bought", "INTEGER NOT NULL DEFAULT 0"),
]


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
        for column, definition in NEW_COLUMNS:
            await conn.execute(
                text(f"ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS {column} {definition}")
            )
            print(f"확인/추가 완료: match_participants.{column}")

        result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'match_participants' "
                "AND column_name IN ('team_id','summoner1_id','summoner2_id',"
                "'vision_score','vision_wards_bought')"
            )
        )
        found = {row[0] for row in result.fetchall()}
        missing = {c for c, _ in NEW_COLUMNS} - found
        if missing:
            print(f"\n경고: 여전히 없는 컬럼이 있습니다: {missing}")
        else:
            print("\n확인 완료: 5개 컬럼 모두 정상적으로 존재합니다.")

    print(
        "\n완료! 백엔드를 재시작한 뒤, 정확한 값을 보려면 "
        "scripts/clear_matches.py로 캐시를 지우고 다시 동기화하세요."
    )


if __name__ == "__main__":
    asyncio.run(main())
