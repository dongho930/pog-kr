"""
패치노트 요약(버프/너프/신규 챔피언 목록) 자동 스크래핑.

⚠️ 실험적 기능 (사용자 요청에 따라 자동 스크래핑 방식을 선택함):
Riot는 "이 챔피언은 버프/너프"라는 구조화된 데이터를 API로 제공하지 않는다.
이 모듈은 Riot 공식 패치노트 페이지(leagueoflegends.com)의 본문에서 스탯
변경 문구("Cooldown: 18 ⇒ 16" 등)를 찾아, 스탯 종류별 극성(polarity)과
증감 방향을 곱해 챔피언별로 합산하는 휴리스틱으로 버프/너프를 분류한다.

시도했던 다른 방법과 그걸 버린 이유 (다음에 또 막히면 참고):
- 처음엔 LoL 공식 위키(wiki.leagueoflegends.com)의 위키텍스트를 썼는데,
  해당 위키가 자동화된 요청을 봇으로 간주해 403으로 차단해서 포기했다.

패치 번호를 구하는 방법:
- Data Dragon 버전(ddragon)은 2025년 시즌 개편 이후 Riot의 마케팅 패치
  번호(예: "26.14")와 더 이상 같지 않다(예: ddragon은 아직 "16.14" 식
  구버전 번호를 씀). 그래서 ddragon 버전을 신뢰하지 않고, Riot 패치노트
  목록 페이지(news/tags/patch-notes)에서 가장 최근 글의 링크를 직접
  찾아 패치 번호와 URL을 얻는다.

한계 (정확도를 100% 보장하지 않음):
- 챔피언 이름은 Data Dragon의 영문 챔피언 목록에 있는 이름이 본문에 "그
  줄만 단독으로" 등장하는 곳을 챔피언 섹션의 시작으로 본다. 페이지 구조가
  예상과 다르면(예: JS로 렌더링되어 서버 응답에 본문이 아예 없는 경우)
  챔피언을 하나도 못 찾을 수 있다 — 이 경우 champions=[] 와 error를
  반환한다 (앱 전체는 죽지 않음).
- 스탯 종류를 전부 알지 못하므로 기본값은 "커질수록 강해짐"(+1)으로 두고,
  쿨다운/코스트/캐스트 딜레이류만 "작을수록 강해짐"(-1)으로 처리한다.
- 리워크(개편)는 별도로 감지하지 않는다 — 스탯 변경 총합으로만 분류된다.
"""

import html as html_module
import re
import time

import httpx

from app.services import ddragon

PATCH_LIST_URL = "https://www.leagueoflegends.com/en-us/news/tags/patch-notes/"
PATCH_LINK_RE = re.compile(
    r'href="(/en-us/news/game-updates/[a-z0-9\-]*?patch-(\d+)-(\d+)-notes/)"',
    re.IGNORECASE,
)

NON_CHAMPION_SECTION_MARKERS = [
    "items",
    "monsters",
    "aram",
    "arena",
    "systems",
    "client",
    "game",
]

# 커질수록 오히려 약해지는(=작을수록 강해지는) 스탯들. 여기 없는 스탯은 전부
# "커질수록 강해짐"으로 취급한다 (데미지/실드/체력/방어력/사거리/이속 등
# 대다수 스탯이 여기 해당하므로 기본값으로 안전하다).
LOWER_IS_STRONGER_KEYWORDS = [
    "cooldown",
    "cost",
    "cast time",
    "delay",
    "windup",
]

CACHE_TTL_SECONDS = 6 * 60 * 60  # 6시간
_cache: dict | None = None
_cache_at: float = 0.0

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# "Cooldown: 18 / 17 ⇒ 16 / 15" 처럼 "스탯명: 이전값 ⇒ 이후값" 형태의 줄에서
# 스탯명과 두 값의 첫 숫자를 뽑아낸다. ⇒/→/->  전부 허용.
DELTA_LINE_RE = re.compile(
    r"^([A-Za-z][A-Za-z0-9 %'\-]{2,40}?):\s*(.+?)\s*(?:⇒|→|->)\s*(.+)$"
)
FIRST_NUMBER_RE = re.compile(r"-?\d+(?:\.\d+)?")


def _stat_polarity(stat_name: str) -> int:
    lowered = stat_name.lower()
    for kw in LOWER_IS_STRONGER_KEYWORDS:
        if kw in lowered:
            return -1
    return 1


def _classify_line(line: str) -> int:
    """"스탯명: 이전 ⇒ 이후" 형태의 줄을 +1(버프 방향)/-1(너프 방향)/0(판단 불가)로 분류."""
    m = DELTA_LINE_RE.match(line)
    if not m:
        return 0
    stat_name, before, after = m.group(1), m.group(2), m.group(3)
    before_num = FIRST_NUMBER_RE.search(before)
    after_num = FIRST_NUMBER_RE.search(after)
    if not before_num or not after_num:
        return 0
    before_val, after_val = float(before_num.group()), float(after_num.group())
    if before_val == after_val:
        return 0
    direction = 1 if after_val > before_val else -1
    return direction * _stat_polarity(stat_name)


def _html_to_lines(html: str) -> list[str]:
    html = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.IGNORECASE | re.DOTALL)
    # 블록 레벨 태그 경계마다 줄바꿈을 넣어서 원래의 줄 구조를 최대한 보존한다.
    html = re.sub(
        r"<(h[1-6]|p|li|div|br|section|article|tr)[^>]*>",
        "\n",
        html,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"<[^>]+>", "", html)
    text = html_module.unescape(text)
    return [line.strip() for line in text.splitlines() if line.strip()]


async def _find_latest_patch_link(client: httpx.AsyncClient) -> tuple[str, str]:
    """Riot 패치노트 목록 페이지에서 가장 최근 글의 (전체 URL, "26.14") 를 반환."""
    resp = await client.get(PATCH_LIST_URL, timeout=20.0)
    resp.raise_for_status()
    m = PATCH_LINK_RE.search(resp.text)
    if not m:
        raise ValueError("Riot 패치노트 목록에서 최신 패치 링크를 찾지 못했습니다 (페이지 구조 변경 추정)")
    path, major, minor = m.group(1), m.group(2), m.group(3)
    return f"https://www.leagueoflegends.com{path}", f"{major}.{minor}"


def _parse_champion_sections(lines: list[str], champion_names: set[str]) -> list[dict]:
    """
    본문 줄 목록에서, 온전히 챔피언 이름 하나로만 이뤄진 줄을 그 챔피언 섹션의
    시작으로 보고, 다음 챔피언 이름(또는 Items/Systems 같은 비챔피언 섹션)이
    나올 때까지의 "스탯명: 이전 ⇒ 이후" 줄들을 모아 버프/너프 점수를 합산한다.
    """
    champions: list[dict] = []
    current: dict | None = None

    for line in lines:
        stripped = line.strip()
        lowered = stripped.lower()

        if stripped in champion_names:
            if current is not None:
                champions.append(current)
            current = {"name": stripped, "is_new": False, "score": 0, "has_change": False}
            continue

        if current is not None and lowered in NON_CHAMPION_SECTION_MARKERS:
            champions.append(current)
            current = None
            continue

        if current is None:
            continue

        if "new champion" in lowered:
            current["is_new"] = True

        signal = _classify_line(stripped)
        if signal != 0:
            current["has_change"] = True
            current["score"] += signal

    if current is not None:
        champions.append(current)

    return champions


async def _fetch_patch_champion_changes(url: str, client: httpx.AsyncClient) -> list[dict]:
    resp = await client.get(url, timeout=20.0)
    resp.raise_for_status()
    lines = _html_to_lines(resp.text)

    name_map = await ddragon.get_champion_id_map_en()
    champion_names = set(name_map.keys())

    parsed = _parse_champion_sections(lines, champion_names)
    parsed = [c for c in parsed if c["has_change"] or c["is_new"]]

    if not parsed:
        raise ValueError(
            "패치노트 본문에서 챔피언 변경 사항을 찾지 못했습니다 "
            "(페이지가 JS로 렌더링되어 서버 응답에 본문이 없거나, 구조가 바뀌었을 수 있음)"
        )

    champions = []
    for c in parsed:
        champ_id = name_map.get(c["name"])
        if champ_id is None:
            continue
        if c["is_new"]:
            change_type = "new"
        elif c["score"] > 0:
            change_type = "buff"
        elif c["score"] < 0:
            change_type = "nerf"
        else:
            change_type = "adjustment"
        champions.append(
            {
                "champion_id": champ_id,
                "champion_name": c["name"],
                "icon_url": ddragon.champion_icon_url(champ_id),
                "change_type": change_type,
            }
        )
    return champions


async def get_latest_patch_summary() -> dict:
    """
    캐시된 패치노트 요약을 반환한다 (6시간 TTL). 스크래핑/분류에 실패하면
    champions=[] 와 error 메시지를 함께 반환한다 — 실패해도 앱 전체가
    영향받지 않도록 예외를 여기서 삼킨다.
    """
    global _cache, _cache_at
    if _cache is not None and (time.time() - _cache_at) < CACHE_TTL_SECONDS:
        return _cache

    result: dict = {"patch": None, "patch_notes_url": None, "champions": [], "error": None}

    try:
        async with httpx.AsyncClient(headers=REQUEST_HEADERS, follow_redirects=True) as client:
            url, patch = await _find_latest_patch_link(client)
            result["patch"] = patch
            result["patch_notes_url"] = url
            result["champions"] = await _fetch_patch_champion_changes(url, client)
    except (httpx.HTTPError, ValueError, KeyError) as e:
        result["error"] = f"패치노트를 불러오지 못했습니다: {e}"

    _cache = result
    _cache_at = time.time()
    return result
