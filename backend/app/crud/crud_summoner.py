from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.summoner import Summoner


async def get_by_puuid(db: AsyncSession, puuid: str) -> Summoner | None:
    result = await db.execute(select(Summoner).where(Summoner.puuid == puuid))
    return result.scalar_one_or_none()


async def get_by_riot_id(db: AsyncSession, game_name: str, tag_line: str) -> Summoner | None:
    result = await db.execute(
        select(Summoner).where(
            Summoner.game_name == game_name, Summoner.tag_line == tag_line
        )
    )
    return result.scalar_one_or_none()


async def upsert_summoner(db: AsyncSession, data: dict) -> Summoner:
    """Riot API에서 받아온 데이터로 소환사 레코드를 갱신하거나 새로 만든다."""
    summoner = await get_by_puuid(db, data["puuid"])
    if summoner is None:
        summoner = Summoner(**data)
        db.add(summoner)
    else:
        for key, value in data.items():
            setattr(summoner, key, value)
    await db.commit()
    await db.refresh(summoner)
    return summoner


async def cache_name_only(
    db: AsyncSession, puuid: str, game_name: str, tag_line: str, platform_region: str
) -> Summoner:
    """
    리더보드처럼 puuid만 있고 프로필 정보는 없을 때, 이름만 가볍게
    캐싱해둔다. 이미 전체 정보로 검색된 적 있는 소환사라면 랭크/아이콘 같은
    기존 데이터는 건드리지 않고 이름만 최신화한다.
    """
    summoner = await get_by_puuid(db, puuid)
    if summoner is None:
        summoner = Summoner(
            puuid=puuid,
            game_name=game_name,
            tag_line=tag_line,
            platform_region=platform_region,
        )
        db.add(summoner)
    else:
        summoner.game_name = game_name
        summoner.tag_line = tag_line
    await db.commit()
    await db.refresh(summoner)
    return summoner
