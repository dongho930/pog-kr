"""
Riot Games API 클라이언트.

주의:
- Riot API는 지역별로 라우팅이 나뉜다.
  · Account/Match-V5 계열  -> 대륙 라우팅 (asia, americas, europe)
  · Summoner/League 계열   -> 플랫폼 라우팅 (kr, na1, euw1 ...)
- Rate limit(예: 20req/1s, 100req/2min)을 반드시 지켜야 하며, 운영 환경에서는
  httpx 재시도 + 429 Retry-After 헤더 처리, 그리고 Redis 등을 이용한
  전역 rate limiter를 두는 것을 권장한다. 여기서는 단일 클라이언트 기준의
  최소 구현만 포함한다.
"""

import httpx

from app.core.config import settings

ACCOUNT_BASE = f"https://{settings.RIOT_ACCOUNT_REGION}.api.riotgames.com"
PLATFORM_BASE = f"https://{settings.RIOT_PLATFORM_REGION}.api.riotgames.com"

HEADERS = {"X-Riot-Token": settings.RIOT_API_KEY}


class RiotAPIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"[{status_code}] {message}")


async def _get(client: httpx.AsyncClient, url: str) -> dict:
    resp = await client.get(url, headers=HEADERS, timeout=10.0)
    if resp.status_code == 404:
        raise RiotAPIError(404, "Not found")
    if resp.status_code == 429:
        raise RiotAPIError(429, "Rate limit exceeded — Retry-After 헤더를 확인하세요")
    resp.raise_for_status()
    return resp.json()


async def get_account_by_riot_id(game_name: str, tag_line: str) -> dict:
    """Riot ID(게임명#태그) -> puuid, gameName, tagLine."""
    url = f"{ACCOUNT_BASE}/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
    async with httpx.AsyncClient() as client:
        return await _get(client, url)


async def get_summoner_by_puuid(puuid: str) -> dict:
    """puuid -> profileIconId, summonerLevel 등."""
    url = f"{PLATFORM_BASE}/lol/summoner/v4/summoners/by-puuid/{puuid}"
    async with httpx.AsyncClient() as client:
        return await _get(client, url)


async def get_league_entries(puuid: str) -> list[dict]:
    """puuid -> 솔로랭크/자유랭크 티어, LP, 승패."""
    url = f"{PLATFORM_BASE}/lol/league/v4/entries/by-puuid/{puuid}"
    async with httpx.AsyncClient() as client:
        return await _get(client, url)


async def get_challenger_league(queue: str = "RANKED_SOLO_5x5") -> dict:
    """챌린저 전체 리스트 (queue: RANKED_SOLO_5x5 | RANKED_FLEX_SR)."""
    url = f"{PLATFORM_BASE}/lol/league/v4/challengerleagues/by-queue/{queue}"
    async with httpx.AsyncClient() as client:
        return await _get(client, url)


async def get_grandmaster_league(queue: str = "RANKED_SOLO_5x5") -> dict:
    """그랜드마스터 전체 리스트."""
    url = f"{PLATFORM_BASE}/lol/league/v4/grandmasterleagues/by-queue/{queue}"
    async with httpx.AsyncClient() as client:
        return await _get(client, url)


async def get_master_league(queue: str = "RANKED_SOLO_5x5") -> dict:
    """마스터 전체 리스트."""
    url = f"{PLATFORM_BASE}/lol/league/v4/masterleagues/by-queue/{queue}"
    async with httpx.AsyncClient() as client:
        return await _get(client, url)


async def get_account_by_puuid(puuid: str) -> dict:
    """puuid -> gameName, tagLine (리더보드처럼 puuid만 있고 이름이 없을 때 역조회용)."""
    url = f"{ACCOUNT_BASE}/riot/account/v1/accounts/by-puuid/{puuid}"
    async with httpx.AsyncClient() as client:
        return await _get(client, url)


async def get_match_ids(puuid: str, count: int = 20, queue: int | None = None) -> list[str]:
    params = f"?start=0&count={count}" + (f"&queue={queue}" if queue else "")
    url = f"{ACCOUNT_BASE}/lol/match/v5/matches/by-puuid/{puuid}/ids{params}"
    async with httpx.AsyncClient() as client:
        return await _get(client, url)


async def get_match(match_id: str) -> dict:
    url = f"{ACCOUNT_BASE}/lol/match/v5/matches/{match_id}"
    async with httpx.AsyncClient() as client:
        return await _get(client, url)


async def get_match_timeline(match_id: str) -> dict:
    """스킬/아이템 구매 타임라인 추출용 — Match-V5 Timeline endpoint."""
    url = f"{ACCOUNT_BASE}/lol/match/v5/matches/{match_id}/timeline"
    async with httpx.AsyncClient() as client:
        return await _get(client, url)


async def get_active_game(puuid: str) -> dict | None:
    """실시간 전적(스펙테이터) 조회. 게임 중이 아니면 404 -> None."""
    url = f"{PLATFORM_BASE}/lol/spectator/v5/active-games/by-summoner/{puuid}"
    try:
        async with httpx.AsyncClient() as client:
            return await _get(client, url)
    except RiotAPIError as e:
        if e.status_code == 404:
            return None
        raise
