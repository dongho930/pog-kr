from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pro_player import ProPlayer


async def list_all(db: AsyncSession) -> list[ProPlayer]:
    result = await db.execute(select(ProPlayer).order_by(ProPlayer.team, ProPlayer.real_name))
    return list(result.scalars().all())


async def upsert(
    db: AsyncSession, game_name: str, tag_line: str, real_name: str, team: str | None
) -> ProPlayer:
    """seed 스크립트 전용 — (game_name, tag_line) 기준으로 있으면 갱신, 없으면 추가."""
    result = await db.execute(
        select(ProPlayer).where(ProPlayer.game_name == game_name, ProPlayer.tag_line == tag_line)
    )
    player = result.scalar_one_or_none()
    if player is None:
        player = ProPlayer(game_name=game_name, tag_line=tag_line, real_name=real_name, team=team)
        db.add(player)
    else:
        player.real_name = real_name
        player.team = team
    await db.commit()
    await db.refresh(player)
    return player


async def set_puuid(db: AsyncSession, player_id: int, puuid: str) -> None:
    player = await db.get(ProPlayer, player_id)
    if player is not None:
        player.puuid = puuid
        await db.commit()
