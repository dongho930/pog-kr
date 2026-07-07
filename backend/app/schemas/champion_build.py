from pydantic import BaseModel


class StatEntry(BaseModel):
    """룬 하나, 아이템 하나, 스펠 조합, 스킬 순서 하나 등 "옵션 하나"에 대한 통계."""

    item_ids: list[int] | list[str]
    games: int
    win_rate: float
    pick_rate: float
    icon_url: str | None = None
    icon_urls: list[str | None] | None = None
    primary_style_icon_url: str | None = None
    sub_style_icon_url: str | None = None


class ChampionBuildOut(BaseModel):
    champion_id: int
    champion_name: str
    champion_icon_url: str
    games: int
    win_rate: float

    rune_page_stats: list[StatEntry]
    keystone_stats: list[StatEntry]
    primary_slot1_stats: list[StatEntry]
    primary_slot2_stats: list[StatEntry]
    primary_slot3_stats: list[StatEntry]
    secondary_rune_stats: list[StatEntry]
    spell_stats: list[StatEntry]
    skill_order_stats: list[StatEntry]
    full_skill_order: list[str | None]
    boots_stats: list[StatEntry]
    trinket_stats: list[StatEntry]
    core_item_stats: list[StatEntry]
