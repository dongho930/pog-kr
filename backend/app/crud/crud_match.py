from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.match import Match, MatchParticipant


async def get_match_history(
    db: AsyncSession, puuid: str, count: int = 20, offset: int = 0
) -> list[Match]:
    result = await db.execute(
        select(Match)
        .join(MatchParticipant)
        .where(MatchParticipant.puuid == puuid)
        .options(selectinload(Match.participants))
        .order_by(Match.game_creation.desc())
        .offset(offset)
        .limit(count)
    )
    return list(result.scalars().unique())


async def get_match_by_id(db: AsyncSession, match_id: str) -> Match | None:
    result = await db.execute(
        select(Match)
        .where(Match.match_id == match_id)
        .options(selectinload(Match.participants))
    )
    return result.scalar_one_or_none()
