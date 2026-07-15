"""
"프로 관전" 탭에 표시할 프로게이머 목록을 등록/갱신한다.

Riot API가 "이 계정은 프로게이머 계정이다"라는 정보를 주지 않기 때문에,
아래 PRO_PLAYERS 목록을 직접 채워서 관리해야 한다. 정확한 현재 라이엇
아이디(게임명#태그)를 확인한 뒤 채워 넣을 것 — 잘못된 계정을 등록하면
엉뚱한 사람의 전적이 "프로게이머"로 표시된다.

주의: 현재 백엔드는 RIOT_PLATFORM_REGION(기본값 kr) 하나만 바라보므로,
반드시 그 지역 서버 계정만 등록해야 정상 동작한다.

실행 방법 (backend 폴더에서, 가상환경 활성화 후):
    python scripts/seed_pro_players.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import AsyncSessionLocal, init_db  # noqa: E402
from app.crud import crud_pro_player  # noqa: E402

# (게임명, 태그, 실명/알려진 이름, 소속팀) — 예시 placeholder이므로 실제 값으로 교체할 것.
PRO_PLAYERS: list[tuple[str, str, str, str | None]] = [
    ("Hide on bush", "KR1", "Faker", "T1"),
    ("The Hank", "Xhh", "Hang", "WBG")
]


async def main() -> None:
    # pro_players 테이블은 백엔드 서버가 처음 시작될 때 자동 생성되는데,
    # 서버를 안 띄우고 이 스크립트만 단독 실행하면 테이블이 없을 수 있다.
    # 그래서 여기서도 한 번 더 보장해준다 (이미 있으면 아무 일도 안 함).
    await init_db()

    async with AsyncSessionLocal() as db:
        for game_name, tag_line, real_name, team in PRO_PLAYERS:
            player = await crud_pro_player.upsert(db, game_name, tag_line, real_name, team)
            print(f"등록/갱신: {player.real_name} ({player.game_name}#{player.tag_line})")

    print(f"\n완료! 총 {len(PRO_PLAYERS)}명 처리했습니다.")


if __name__ == "__main__":
    asyncio.run(main())
