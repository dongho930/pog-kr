import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import crud_champion
from app.schemas.match import LiveGameOut, LiveGameParticipant
from app.services import ddragon, riot_api

logger = logging.getLogger(__name__)

router = APIRouter(tags=["live"])

QUEUE_LABELS = {
    420: "개인/2인 랭크 게임",
    440: "자유랭크",
    430: "일반(블라인드)",
    400: "일반(드래프트)",
    450: "칼바람 나락",
    900: "우르프",
}
MAP_LABELS = {11: "소환사의 협곡", 12: "칼바람 나락"}


@router.get("/summoners/{puuid}/live", response_model=LiveGameOut)
async def get_live_game(puuid: str):
    """실시간 전적(현재 게임 진행 중인지 + 참가자 정보)."""
    try:
        game = await riot_api.get_active_game(puuid)
    except riot_api.RiotAPIError as e:
        raise HTTPException(e.status_code, e.message) from e

    if game is None:
        return LiveGameOut(in_game=False)

    participants = [
        LiveGameParticipant(
            puuid=p["puuid"],
            game_name=p.get("riotId", "").split("#")[0],
            tag_line=p.get("riotId", "").split("#")[-1],
            champion_id=p["championId"],
            team_id=p["teamId"],
        )
        for p in game.get("participants", [])
    ]

    return LiveGameOut(
        in_game=True,
        game_mode=game.get("gameMode"),
        game_length_seconds=game.get("gameLength"),
        participants=participants,
    )


async def _fetch_riot_data(sem: asyncio.Semaphore, p: dict) -> dict:
    """
    참가자 한 명의 Riot API 데이터(소환사 레벨/티어)만 조회한다. DB에는
    손대지 않으므로 여러 명을 동시에(asyncio.gather) 조회해도 안전하다.
    다만 Riot 요청 제한에 걸리지 않도록 세마포어로 동시 실행 개수를 제한한다.
    """
    puuid = p["puuid"]
    champion_id = p["championId"]
    perks = p.get("perks", {})
    perk_ids = perks.get("perkIds", [])

    result: dict = {
        "puuid": puuid,
        "game_name": p.get("riotId", "").split("#")[0],
        "tag_line": p.get("riotId", "").split("#")[-1],
        "team_id": p["teamId"],
        "champion_id": champion_id,
        "champion_icon_url": ddragon.champion_icon_url(champion_id),
        "spell1_icon_url": ddragon.spell_icon_url(p.get("spell1Id")),
        "spell2_icon_url": ddragon.spell_icon_url(p.get("spell2Id")),
        "keystone_icon_url": ddragon.rune_icon_url(perk_ids[0]) if perk_ids else None,
        "primary_style_icon_url": ddragon.rune_style_icon_url(perks.get("perkStyle")),
        "sub_style_icon_url": ddragon.rune_style_icon_url(perks.get("perkSubStyle")),
        "profile_icon_url": None,
        "summoner_level": None,
        "tier": None,
        "rank": None,
        "lp": 0,
        "season_wins": 0,
        "season_losses": 0,
        "champion_games": 0,
        "champion_win_rate": None,
        "champion_kda": None,
        "champion_kills": None,
        "champion_deaths": None,
        "champion_assists": None,
    }

    async with sem:
        try:
            summoner_info = await riot_api.get_summoner_by_puuid(puuid)
            result["profile_icon_url"] = ddragon.profile_icon_url(summoner_info.get("profileIconId", 0))
            result["summoner_level"] = summoner_info.get("summonerLevel")
        except Exception:
            logger.warning("참가자 소환사 정보 조회 실패 (puuid=%s)", puuid, exc_info=True)

        try:
            league_entries = await riot_api.get_league_entries(puuid)
            solo = next((e for e in league_entries if e.get("queueType") == "RANKED_SOLO_5x5"), None)
            if solo:
                result["tier"] = solo["tier"]
                result["rank"] = solo["rank"]
                result["lp"] = solo["leaguePoints"]
                result["season_wins"] = solo["wins"]
                result["season_losses"] = solo["losses"]
        except Exception:
            logger.warning("참가자 리그 정보 조회 실패 (puuid=%s)", puuid, exc_info=True)

    return result


async def _attach_champion_stats(db: AsyncSession, result: dict) -> None:
    """DB 조회는 세션을 공유하므로 반드시 한 번에 하나씩(순차) 호출할 것."""
    try:
        champ_stats = await crud_champion.get_champion_stats_for_puuid(db, result["puuid"])
        stat = next((s for s in champ_stats if s["champion_id"] == result["champion_id"]), None)
        if stat:
            result["champion_games"] = stat["games"]
            result["champion_win_rate"] = stat["win_rate"]
            result["champion_kda"] = stat["kda"]
            result["champion_kills"] = stat["kills"]
            result["champion_deaths"] = stat["deaths"]
            result["champion_assists"] = stat["assists"]
    except Exception:
        logger.exception("챔피언 통계 조회 실패 (puuid=%s)", result["puuid"])


@router.get("/summoners/{puuid}/live-detail")
async def get_live_game_detail(puuid: str, db: AsyncSession = Depends(get_db)):
    """
    관전/인게임 정보 패널용 상세 데이터. 기본 /live 엔드포인트보다 훨씬
    무겁다(참가자 10명 각각 추가 조회) — 목록에서는 쓰지 말고, 사용자가
    실제로 "인게임 정보 보기"를 눌렀을 때만 호출할 것.

    Riot API 조회는 세마포어로 동시 실행 개수를 제한해 동시에(asyncio.gather)
    처리하지만, DB 조회는 세션을 공유하기 때문에 반드시 순차적으로 처리한다
    (비동기 세션을 여러 코루틴이 동시에 쓰면 요청이 응답 없이 멈출 수 있음 —
    실제로 이 문제 때문에 프론트에서 "Failed to fetch"가 발생했었다).
    """
    try:
        game = await riot_api.get_active_game(puuid)
    except riot_api.RiotAPIError as e:
        raise HTTPException(e.status_code, e.message) from e

    if game is None:
        return {"in_game": False}

    sem = asyncio.Semaphore(4)
    participants = await asyncio.gather(
        *[_fetch_riot_data(sem, p) for p in game.get("participants", [])]
    )

    for result in participants:
        await _attach_champion_stats(db, result)

    queue_id = game.get("gameQueueConfigId")

    bans: dict[str, list[str]] = {"100": [], "200": []}
    for ban in game.get("bannedChampions", []):
        champion_id = ban.get("championId", -1)
        if champion_id <= 0:  # -1 = 밴 안 함
            continue
        team_key = str(ban.get("teamId"))
        if team_key in bans:
            bans[team_key].append(ddragon.champion_icon_url(champion_id))

    return {
        "in_game": True,
        "queue_label": QUEUE_LABELS.get(queue_id, f"큐 {queue_id}"),
        "map_label": MAP_LABELS.get(game.get("mapId"), "소환사의 협곡"),
        "game_length_seconds": game.get("gameLength"),
        "participants": list(participants),
        "bans": {100: bans["100"], 200: bans["200"]},
    }
