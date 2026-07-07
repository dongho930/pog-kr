"""
매치 데이터 동기화.

Riot Match-V5 API(매치 상세) + Timeline API(스킬/아이템 구매 이벤트)를 조합해
Match / MatchParticipant 테이블을 채운다.

NOTE: 지금은 "매치 히스토리를 조회할 때마다 최신 N경기를 동기화"하는 on-demand
방식이라 요청마다 Riot API를 여러 번 호출한다. 사용자가 늘어나면 rate limit에
쉽게 걸리므로, 실제 운영 단계에서는 이 로직을 별도 배치/워커로 옮기고 이 함수는
DB만 조회하도록 바꾸는 것을 권장한다.
"""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.crud_match import get_match_by_id
from app.models.match import Match, MatchParticipant
from app.services import riot_api

import logging

logger = logging.getLogger(__name__)

SKILL_SLOT_MAP = {1: "Q", 2: "W", 3: "E", 4: "R"}


def _extract_patch(game_version: str) -> str:
    parts = game_version.split(".")
    return f"{parts[0]}.{parts[1]}" if len(parts) >= 2 else game_version


def _parse_participant(p: dict) -> dict:
    items = [p.get(f"item{i}", 0) for i in range(7)]
    styles = p.get("perks", {}).get("styles", [])
    primary_style = next(
        (s.get("style") for s in styles if s.get("description") == "primaryStyle"), None
    )
    sub_style = next(
        (s.get("style") for s in styles if s.get("description") == "subStyle"), None
    )
    # 키스톤 룬 = 주 룬트리(primaryStyle)의 첫 번째 선택지. 나머지 3개는
    # 주 룬트리의 보조 슬롯, subStyle 2개는 보조 룬트리에서 고른 룬.
    primary_selections = next(
        (s.get("selections", []) for s in styles if s.get("description") == "primaryStyle"), []
    )
    sub_selections = next(
        (s.get("selections", []) for s in styles if s.get("description") == "subStyle"), []
    )
    keystone_id = primary_selections[0]["perk"] if primary_selections else None
    primary_rune_ids = [sel["perk"] for sel in primary_selections]
    secondary_rune_ids = [sel["perk"] for sel in sub_selections]

    runes = {
        "primary_style": primary_style,
        "sub_style": sub_style,
        "keystone": keystone_id,
        "primary_runes": primary_rune_ids,
        "secondary_runes": secondary_rune_ids,
    }
    return {
        "puuid": p["puuid"],
        "champion_id": p["championId"],
        "team_position": p.get("teamPosition", ""),
        "team_id": p.get("teamId", 100),
        "game_name": p.get("riotIdGameName", ""),
        "tag_line": p.get("riotIdTagLine", ""),
        "win": p["win"],
        "kills": p["kills"],
        "deaths": p["deaths"],
        "assists": p["assists"],
        "cs": p.get("totalMinionsKilled", 0) + p.get("neutralMinionsKilled", 0),
        "gold_earned": p.get("goldEarned", 0),
        "champion_level": p.get("champLevel", 1),
        "damage_dealt": p.get("totalDamageDealtToChampions", 0),
        "damage_taken": p.get("totalDamageTaken", 0),
        "items": items,
        "runes": runes,
        "summoner1_id": p.get("summoner1Id", 0),
        "summoner2_id": p.get("summoner2Id", 0),
        "vision_score": p.get("visionScore", 0),
        "vision_wards_bought": p.get("visionWardsBoughtInGame", 0),
        "double_kills": p.get("doubleKills", 0),
        "triple_kills": p.get("tripleKills", 0),
        "quadra_kills": p.get("quadraKills", 0),
        "penta_kills": p.get("pentaKills", 0),
    }


def _parse_timeline(timeline_data: dict) -> dict[str, dict]:
    """puuid -> {"skill_order": [...], "item_timeline": [...]}"""
    puuid_by_pid = {
        p["participantId"]: p["puuid"] for p in timeline_data["info"]["participants"]
    }
    result = {puuid: {"skill_order": [], "item_timeline": []} for puuid in puuid_by_pid.values()}
    level_counter = {puuid: 0 for puuid in puuid_by_pid.values()}

    for frame in timeline_data["info"]["frames"]:
        for event in frame.get("events", []):
            puuid = puuid_by_pid.get(event.get("participantId"))
            if not puuid:
                continue
            ts = event["timestamp"] // 1000  # ms -> s

            if event.get("type") == "SKILL_LEVEL_UP":
                level_counter[puuid] += 1
                skill = SKILL_SLOT_MAP.get(event.get("skillSlot"), "?")
                result[puuid]["skill_order"].append(
                    {"level": level_counter[puuid], "skill": skill, "timestamp": ts}
                )
            elif event.get("type") == "ITEM_PURCHASED":
                result[puuid]["item_timeline"].append(
                    {"item_id": event["itemId"], "timestamp": ts}
                )
    return result


def _parse_team_objectives(teams: list[dict]) -> dict:
    """팀별 오브젝트(바론/드래곤/타워/전령/억제기) 킬 수를 뽑아낸다."""
    result: dict[str, dict] = {}
    for team in teams:
        objectives = team.get("objectives", {})
        result[str(team["teamId"])] = {
            "baron": objectives.get("baron", {}).get("kills", 0),
            "dragon": objectives.get("dragon", {}).get("kills", 0),
            "tower": objectives.get("tower", {}).get("kills", 0),
            "herald": objectives.get("riftHerald", {}).get("kills", 0),
            "inhibitor": objectives.get("inhibitor", {}).get("kills", 0),
        }
    return result


async def save_match_if_new(db: AsyncSession, match_id: str) -> Match:
    existing = await get_match_by_id(db, match_id)
    if existing:
        return existing

    match_data = await riot_api.get_match(match_id)
    timeline_data = await riot_api.get_match_timeline(match_id)

    info = match_data["info"]
    metadata = match_data["metadata"]
    timelines = _parse_timeline(timeline_data)

    match = Match(
        match_id=metadata["matchId"],
        queue_id=info["queueId"],
        game_duration=info["gameDuration"],
        game_creation=datetime.fromtimestamp(info["gameCreation"] / 1000, tz=timezone.utc),
        patch=_extract_patch(info["gameVersion"]),
        team_objectives=_parse_team_objectives(info.get("teams", [])),
    )

    for p in info["participants"]:
        pdata = _parse_participant(p)
        tl = timelines.get(pdata["puuid"], {"skill_order": [], "item_timeline": []})
        match.participants.append(
            MatchParticipant(
                **pdata,
                skill_order=tl["skill_order"],
                item_timeline=tl["item_timeline"],
            )
        )

    db.add(match)
    await db.commit()
    await db.refresh(match)
    return match


async def sync_recent_matches(db: AsyncSession, puuid: str, count: int = 10) -> None:
    """최근 N경기를 Riot API에서 가져와 DB에 없는 것만 저장한다."""
    match_ids = await riot_api.get_match_ids(puuid, count=count)
    for match_id in match_ids:
        try:
            await save_match_if_new(db, match_id)
        except riot_api.RiotAPIError as e:
            logger.warning("매치 저장 실패 (match_id=%s): [%s] %s", match_id, e.status_code, e.message)
            if e.status_code == 429:
                # rate limit에 걸리면 나머지 매치도 계속 실패할 것이 뻔하므로
                # 바로 상위로 전달해서 사용자에게 알린다 (계속 조용히 넘어가지 않음).
                raise
            continue
