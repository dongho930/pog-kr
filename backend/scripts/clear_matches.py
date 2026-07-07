"""
캐시된 매치/매치참가자 데이터를 전부 지운다.

이 스크립트가 필요한 상황: MatchParticipant 모델에 새 컬럼(예: 더블/트리플/
쿼드라/펜타킬)을 추가했는데, 이미 DB에 저장돼 있던 매치들은 그 컬럼이
생기기 전에 저장된 거라 기본값(0)만 채워져 있다. match_sync.py의
save_match_if_new()는 "이미 DB에 있는 매치면 건드리지 않는다" 방식이라,
캐시를 지우기 전에는 Riot API에서 다시 받아오지 않는다.

이 스크립트로 캐시를 지우면, 다음에 소환사 프로필의 "매치 히스토리" 탭을
열 때 Riot API에서 해당 소환사의 최근 경기를 처음부터 다시 받아온다
(자동, 별도 조치 불필요 — app/services/match_sync.py 참고).

실행 방법 (backend 폴더에서, 가상환경 활성화 후):
    python scripts/clear_matches.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402

from app.core.database import engine  # noqa: E402


async def main() -> None:
    async with engine.begin() as conn:
        # FK 의존 관계상 match_participants를 먼저 지운다
        result = await conn.execute(text("DELETE FROM match_participants"))
        print(f"match_participants {result.rowcount}행 삭제")

        result = await conn.execute(text("DELETE FROM matches"))
        print(f"matches {result.rowcount}행 삭제")

    print(
        "\n완료! 이제 소환사 프로필의 '매치 히스토리' 탭을 다시 열면 "
        "Riot API에서 새 데이터(멀티킬 포함)를 자동으로 받아옵니다."
    )


if __name__ == "__main__":
    asyncio.run(main())
