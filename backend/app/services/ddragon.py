"""
Riot 공식 Data Dragon에서 챔피언 ID -> 한글 이름 매핑을 가져오고,
소환사/챔피언/아이템 아이콘 URL을 만들어주는 헬퍼.

프론트엔드는 이 URL 규칙을 몰라도 되도록, 아이콘 URL은 백엔드가 API 응답에
필드로 내려준다 (예: SummonerOut.profile_icon_url).
"""

import httpx

_NAME_CACHE: dict[int, str] | None = None
_VERSION_CACHE: str | None = None
_SPELL_ICON_CACHE: dict[int, str] | None = None
_RUNE_ICON_CACHE: dict[int, str] | None = None
_RUNE_STYLE_ICON_CACHE: dict[int, str] | None = None  # 룬트리(주/보조) 자체의 아이콘
_ITEM_TAGS_CACHE: dict[int, list[str]] | None = None  # 아이템 ID -> 태그 목록 (예: ["Boots"])
_ITEM_NAME_CACHE: dict[int, str] | None = None  # 아이템 ID -> 한글 이름

# 서포터 퀘스트템(2024 시즌 개편 이후) 이름들. 패치마다 라인업이 바뀔 수 있어
# 이름 기반으로 매칭한다 — 새 시즌에 이름이 바뀌면 이 목록만 갱신하면 된다.
SUPPORT_QUEST_ITEM_NAMES = {
    "재물 공유",  # 시작 아이템
    "룬 나침반",  # 1차 진화
    "세계의 결실",  # 2차 진화
    "자자크의 세계가시",
    "피의 노래",
    "태양의 썰매",
    "꿈 생성기",
    "천상의 이의",
}

VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json"
FALLBACK_VERSION = "14.20.1"


def _champion_ko_url(version: str) -> str:
    return f"https://ddragon.leagueoflegends.com/cdn/{version}/data/ko_KR/champion.json"


async def get_champion_name_map() -> dict[int, str]:
    """챔피언 숫자 ID -> 한글 이름 (예: 103 -> "아리"). Data Dragon 공식 데이터 사용."""
    global _NAME_CACHE
    if _NAME_CACHE is not None:
        return _NAME_CACHE

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(_champion_ko_url(_current_version()), timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
        _NAME_CACHE = {
            int(champ["key"]): champ["name"] for champ in data.get("data", {}).values()
        }
    except (httpx.HTTPError, ValueError, KeyError):
        _NAME_CACHE = {}

    return _NAME_CACHE


async def get_champion_name(champion_id: int) -> str:
    mapping = await get_champion_name_map()
    return mapping.get(champion_id, f"챔피언 {champion_id}")


async def refresh_latest_version() -> str:
    """앱 시작 시 한 번 호출해 최신 패치 버전을 캐싱한다 (main.py lifespan 참고)."""
    global _VERSION_CACHE
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(VERSIONS_URL, timeout=10.0)
            resp.raise_for_status()
            versions = resp.json()
        _VERSION_CACHE = versions[0] if versions else FALLBACK_VERSION
    except httpx.HTTPError:
        _VERSION_CACHE = FALLBACK_VERSION
    return _VERSION_CACHE


async def refresh_spell_icons() -> None:
    """소환사 주문(스펠) ID -> 아이콘 URL 매핑을 캐싱한다 (Data Dragon summoner.json)."""
    global _SPELL_ICON_CACHE
    url = f"https://ddragon.leagueoflegends.com/cdn/{_current_version()}/data/en_US/summoner.json"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
        _SPELL_ICON_CACHE = {
            int(spell["key"]): (
                f"https://ddragon.leagueoflegends.com/cdn/{_current_version()}"
                f"/img/spell/{spell['image']['full']}"
            )
            for spell in data.get("data", {}).values()
        }
    except (httpx.HTTPError, KeyError, ValueError):
        _SPELL_ICON_CACHE = {}


async def refresh_rune_icons() -> None:
    """룬(perk) ID -> 아이콘 URL, 룬트리(style) ID -> 아이콘 URL을 캐싱한다
    (Data Dragon runesReforged.json).

    주의: 룬 이미지는 다른 자산과 달리 패치 버전 없이 /cdn/img/ 경로로 제공된다.
    """
    global _RUNE_ICON_CACHE, _RUNE_STYLE_ICON_CACHE
    url = f"https://ddragon.leagueoflegends.com/cdn/{_current_version()}/data/en_US/runesReforged.json"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
            styles = resp.json()
        icons: dict[int, str] = {}
        style_icons: dict[int, str] = {}
        for style in styles:
            style_icons[style["id"]] = f"https://ddragon.leagueoflegends.com/cdn/img/{style['icon']}"
            for slot in style.get("slots", []):
                for rune in slot.get("runes", []):
                    icons[rune["id"]] = f"https://ddragon.leagueoflegends.com/cdn/img/{rune['icon']}"
        _RUNE_ICON_CACHE = icons
        _RUNE_STYLE_ICON_CACHE = style_icons
    except (httpx.HTTPError, KeyError, ValueError):
        _RUNE_ICON_CACHE = {}
        _RUNE_STYLE_ICON_CACHE = {}


async def refresh_item_tags() -> None:
    """
    아이템 ID -> 태그 목록, 아이템 ID -> 한글 이름을 캐싱한다 (Data Dragon
    item.json). 신발류는 태그에 "Boots"가 포함되어 있어 안정적으로 식별할
    수 있고, 서포터 퀘스트템은 태그가 따로 없어서 이름으로 매칭한다
    (SUPPORT_QUEST_ITEM_NAMES 참고 — 시즌마다 아이템 라인업이 바뀌면 이
    목록을 갱신해야 한다).
    """
    global _ITEM_TAGS_CACHE, _ITEM_NAME_CACHE
    tags: dict[int, list[str]] = {}
    names: dict[int, str] = {}
    try:
        async with httpx.AsyncClient() as client:
            en_resp = await client.get(
                f"https://ddragon.leagueoflegends.com/cdn/{_current_version()}/data/en_US/item.json",
                timeout=10.0,
            )
            en_resp.raise_for_status()
            en_data = en_resp.json()
            for item_id, item in en_data.get("data", {}).items():
                tags[int(item_id)] = item.get("tags", [])

            ko_resp = await client.get(
                f"https://ddragon.leagueoflegends.com/cdn/{_current_version()}/data/ko_KR/item.json",
                timeout=10.0,
            )
            ko_resp.raise_for_status()
            ko_data = ko_resp.json()
            for item_id, item in ko_data.get("data", {}).items():
                names[int(item_id)] = item.get("name", "")
        _ITEM_TAGS_CACHE = tags
        _ITEM_NAME_CACHE = names
    except (httpx.HTTPError, KeyError, ValueError):
        _ITEM_TAGS_CACHE = {}
        _ITEM_NAME_CACHE = {}


def is_boots(item_id: int) -> bool:
    if not item_id or not _ITEM_TAGS_CACHE:
        return False
    return "Boots" in _ITEM_TAGS_CACHE.get(item_id, [])


def is_support_quest_item(item_id: int) -> bool:
    if not item_id or not _ITEM_NAME_CACHE:
        return False
    return _ITEM_NAME_CACHE.get(item_id, "") in SUPPORT_QUEST_ITEM_NAMES


def spell_icon_url(spell_id: int) -> str | None:
    if not spell_id or not _SPELL_ICON_CACHE:
        return None
    return _SPELL_ICON_CACHE.get(spell_id)


def rune_icon_url(perk_id: int | None) -> str | None:
    if not perk_id or not _RUNE_ICON_CACHE:
        return None
    return _RUNE_ICON_CACHE.get(perk_id)


def rune_style_icon_url(style_id: int | None) -> str | None:
    """주/보조 룬트리 자체의 아이콘 (예: 지배 트리 아이콘)."""
    if not style_id or not _RUNE_STYLE_ICON_CACHE:
        return None
    return _RUNE_STYLE_ICON_CACHE.get(style_id)


def _current_version() -> str:
    return _VERSION_CACHE or FALLBACK_VERSION


def profile_icon_url(profile_icon_id: int) -> str:
    return (
        f"https://ddragon.leagueoflegends.com/cdn/{_current_version()}"
        f"/img/profileicon/{profile_icon_id}.png"
    )


def champion_icon_url(champion_id: int) -> str:
    # Community Dragon은 숫자 챔피언 ID를 그대로 받아 버전 관리가 필요 없다.
    return f"https://cdn.communitydragon.org/latest/champion/{champion_id}/square"


def item_icon_url(item_id: int) -> str | None:
    if not item_id:
        return None  # 빈 아이템 슬롯(0)은 아이콘 없음
    # Community Dragon의 숫자 ID 기반 아이템 경로가 불안정해서, 이미 검증된
    # profile_icon_url과 동일하게 Riot 공식 Data Dragon 경로를 사용한다.
    return f"https://ddragon.leagueoflegends.com/cdn/{_current_version()}/img/item/{item_id}.png"
