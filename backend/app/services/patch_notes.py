"""
패치노트 요약(버프/너프/신규 챔피언 목록) 자동 스크래핑.

⚠️ 실험적 기능 (사용자 요청에 따라 자동 스크래핑 방식을 선택함):
Riot는 "이 챔피언은 버프/너프"라는 구조화된 데이터를 API로 제공하지 않는다.
이 모듈은 LoL 공식 위키(wiki.leagueoflegends.com)의 패치 문서에서
"Champions" 섹션의 위키텍스트(소스)를 MediaWiki API로 가져온 뒤, 각 스탯
변경 문구("Cooldown reduced to X from Y" 등)를 스탯 종류별 극성(polarity)과
증감 방향을 곱해 챔피언별로 합산하는 휴리스틱으로 버프/너프를 분류한다.

한계 (정확도를 100% 보장하지 않음):
- 스탯 종류를 전부 알지 못하므로 기본값은 "커질수록 강해짐"(+1)으로 두고,
  쿨다운/코스트/캐스트 딜레이류만 "작을수록 강해짐"(-1)으로 처리한다.
  분류 목록에 없는 특이한 스탯은 오분류될 수 있다.
- "changed to X from Y"처럼 방향을 문구만으로 판단하기 애매한 항목은
  집계에서 제외한다.
- 리워크(개편)는 별도로 감지하지 않는다 — 스탯 변경 총합으로만 분류된다.
- 위키 페이지 구조가 바뀌면(문서 개편, 섹션 이름 변경 등) 파싱이 깨질 수
  있다. 이 경우 champions=[] 와 error 메시지를 반환한다 (앱 전체는 죽지 않음).
"""

import re
import time

import httpx

from app.services import ddragon

WIKI_API = "https://wiki.leagueoflegends.com/en-us/api.php"
RIOT_PATCH_NOTES_BASE = "https://www.leagueoflegends.com/en-us/news/game-updates/"

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

CHANGE_RE = re.compile(
    r"([A-Za-z][A-Za-z0-9 %'\-]*?)\s+(increased|reduced|decreased)\s+to\b",
    re.IGNORECASE,
)
CHAMPION_HEADER_RE = re.compile(r"'''\[\[([^\]|]+)(?:\|[^\]]+)?\]\]'''")


def _stat_polarity(stat_phrase: str) -> int:
    lowered = stat_phrase.lower()
    for kw in LOWER_IS_STRONGER_KEYWORDS:
        if kw in lowered:
            return -1
    return 1


def _classify_bullet(text: str) -> int:
    """한 줄(스탯 변경 문구)을 읽어 +1(버프 방향)/-1(너프 방향)/0(판단 불가)을 반환."""
    if "bug fix" in text.lower():
        return 0
    m = CHANGE_RE.search(text)
    if not m:
        return 0
    stat_phrase, verb = m.group(1), m.group(2).lower()
    direction = 1 if verb == "increased" else -1
    polarity = _stat_polarity(stat_phrase)
    return direction * polarity


def _strip_wikitext_markup(line: str) -> str:
    line = re.sub(r"\[\[File:[^\]]+\]\]", "", line, flags=re.IGNORECASE)
    line = re.sub(r"\[\[[^\]|]*\|([^\]]+)\]\]", r"\1", line)  # [[A|B]] -> B
    line = re.sub(r"\[\[([^\]]+)\]\]", r"\1", line)  # [[A]] -> A
    line = line.replace("'''", "").replace("''", "")
    return line.strip()


def _parse_champions_wikitext(wikitext: str) -> list[dict]:
    """
    "Champions" 섹션 위키텍스트를 챔피언별로 분리해서
    [{"name": "Aphelios", "is_new": False, "score": 2, "has_change": True}, ...] 로 반환.
    """
    champions: list[dict] = []
    current: dict | None = None

    for raw_line in wikitext.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        header_match = CHAMPION_HEADER_RE.search(line)
        # 챔피언 헤더 줄은 "*"로 시작하지 않는 문단이다 (불릿은 스탯 변경 줄).
        if header_match and not line.startswith("*"):
            if current is not None:
                champions.append(current)
            current = {
                "name": header_match.group(1),
                "is_new": "new champion" in line.lower(),
                "score": 0,
                "has_change": False,
            }
            continue

        if line.startswith("*") and current is not None:
            clean = _strip_wikitext_markup(line.lstrip("*").strip())
            signal = _classify_bullet(clean)
            if signal != 0:
                current["has_change"] = True
            current["score"] += signal

    if current is not None:
        champions.append(current)

    return champions


async def _resolve_champion_ids(names: list[str]) -> dict[str, int]:
    name_map = await ddragon.get_champion_id_map_en()
    result: dict[str, int] = {}
    for name in names:
        if name in name_map:
            result[name] = name_map[name]
            continue
        # 아포스트로피/공백/점 표기 차이 대응 (Kai'Sa, K'Sante, Dr. Mundo 등)
        normalized = re.sub(r"[^a-z0-9]", "", name.lower())
        for cand_name, cand_id in name_map.items():
            if re.sub(r"[^a-z0-9]", "", cand_name.lower()) == normalized:
                result[name] = cand_id
                break
    return result


def _patch_wiki_page(version: str) -> str:
    parts = version.split(".")
    major_minor = ".".join(parts[:2]) if len(parts) >= 2 else version
    return f"V{major_minor}"


def _patch_notes_url(version: str) -> str:
    parts = version.split(".")
    major_minor = "-".join(parts[:2]) if len(parts) >= 2 else version
    return f"{RIOT_PATCH_NOTES_BASE}league-of-legends-patch-{major_minor}-notes/"


async def _fetch_champions_wikitext(page_title: str) -> str:
    # httpx 기본 User-Agent("python-httpx/...")는 상당수 사이트에서 봇으로
    # 간주해 차단하기 때문에, 일반 브라우저처럼 보이는 UA를 명시한다.
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; pog.kr-patchnotes/1.0; "
            "+https://pog.kr) PatchNotesFetcher"
        )
    }

    async with httpx.AsyncClient(headers=headers) as client:
        sections_resp = await client.get(
            WIKI_API,
            params={"action": "parse", "page": page_title, "format": "json", "prop": "sections"},
            timeout=15.0,
        )
        sections_resp.raise_for_status()
        sections_data = sections_resp.json()
        if "parse" not in sections_data:
            api_error = sections_data.get("error", {}).get("info", str(sections_data)[:300])
            raise ValueError(f"위키 API가 예상과 다른 응답을 줬습니다 (page={page_title}): {api_error}")
        sections = sections_data["parse"]["sections"]
        champ_section = next((s for s in sections if s.get("line") == "Champions"), None)
        if champ_section is None:
            raise ValueError("위키에서 'Champions' 섹션을 찾을 수 없습니다 (문서 구조가 바뀌었을 수 있음)")

        text_resp = await client.get(
            WIKI_API,
            params={
                "action": "parse",
                "page": page_title,
                "format": "json",
                "prop": "wikitext",
                "section": champ_section["index"],
            },
            timeout=15.0,
        )
        text_resp.raise_for_status()
        text_data = text_resp.json()
        if "parse" not in text_data:
            api_error = text_data.get("error", {}).get("info", str(text_data)[:300])
            raise ValueError(f"위키 API가 예상과 다른 응답을 줬습니다 (wikitext 조회): {api_error}")
        return text_data["parse"]["wikitext"]["*"]


async def get_latest_patch_summary() -> dict:
    """
    캐시된 패치노트 요약을 반환한다 (6시간 TTL). 스크래핑/분류에 실패하면
    champions=[] 와 error 메시지를 함께 반환한다 — 실패해도 앱 전체가
    영향받지 않도록 예외를 여기서 삼킨다.
    """
    global _cache, _cache_at
    if _cache is not None and (time.time() - _cache_at) < CACHE_TTL_SECONDS:
        return _cache

    version = await ddragon.refresh_latest_version()
    page_title = _patch_wiki_page(version)

    result: dict = {
        "patch": page_title.lstrip("V"),
        "patch_notes_url": _patch_notes_url(version),
        "champions": [],
        "error": None,
    }

    try:
        wikitext = await _fetch_champions_wikitext(page_title)
        parsed = [c for c in _parse_champions_wikitext(wikitext) if c["has_change"] or c["is_new"]]

        id_map = await _resolve_champion_ids([c["name"] for c in parsed])

        champions = []
        for c in parsed:
            champ_id = id_map.get(c["name"])
            if champ_id is None:
                continue  # 이름 매칭 실패 (드물게 아이템/시스템 항목이 잘못 걸렸을 가능성)
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
        result["champions"] = champions
    except (httpx.HTTPError, ValueError, KeyError) as e:
        result["error"] = f"패치노트를 불러오지 못했습니다: {e}"

    _cache = result
    _cache_at = time.time()
    return result
