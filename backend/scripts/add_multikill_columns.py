"""
기존에 만들어져 있던 match_participants 테이블에 더블킬/트리플킬/쿼드라킬/
펜타킬 컬럼을 추가한다.

Alembic 같은 마이그레이션 도구 없이 create_all()만 쓰고 있어서, 모델에
컬럼을 새로 추가해도 기존 테이블은 자동으로 갱신되지 않는다. 이 스크립트는
그 간극을 메우는 1회성 수동 마이그레이션이다. ADD COLUMN IF NOT EXISTS를
쓰기 때문에 여러 번 실행해도 안전하고, 기존에 쌓인 매치 데이터도 지워지지
않는다 (DROP TABLE과 다르게 데이터 보존).

실행 방법 (backend 폴더에서, 가상환경 활성화 후):
    python scripts/add_multikill_columns.py
"""

import asyncio
import sys
from pathlib import Path

# backend/ 를 import 경로에 추가 (scripts/ 하위에서 실행해도 app 패키지를 찾도록)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import engine  # noqa: E402

NEW_COLUMNS = ["double_kills", "triple_kills", "quadra_kills", "penta_kills"]


def _masked_url() -> str:
    # 비밀번호를 가려서 출력 (연결 대상 DB가 맞는지 확인용)
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
        for column in NEW_COLUMNS:
            await conn.execute(
                text(
                    f"ALTER TABLE match_participants "
                    f"ADD COLUMN IF NOT EXISTS {column} INTEGER NOT NULL DEFAULT 0"
                )
            )
            print(f"확인/추가 완료: match_participants.{column}")

        # 실제로 컬럼이 반영됐는지 information_schema로 재확인
        result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'match_participants' "
                "AND column_name IN ('double_kills','triple_kills','quadra_kills','penta_kills')"
            )
        )
        found = {row[0] for row in result.fetchall()}
        missing = set(NEW_COLUMNS) - found
        if missing:
            print(f"\n경고: 여전히 없는 컬럼이 있습니다: {missing}")
            print("→ 다른 데이터베이스에 연결된 건 아닌지 위 '연결 대상 DB'를 확인해보세요.")
        else:
            print("\n확인 완료: 4개 컬럼 모두 정상적으로 존재합니다.")

    print("\n완료! 이제 백엔드를 재시작하고 다시 시도해보세요.")


if __name__ == "__main__":
    asyncio.run(main())
