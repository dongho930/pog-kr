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
    full_order: list[str | None] | None = None  # 스킬 우선순위 항목 전용: 레벨별 전체 순서


class RuneOptionOut(BaseModel):
    rune_id: int
    icon_url: str | None
    chosen: bool


class RuneRowOut(BaseModel):
    options: list[RuneOptionOut]


class ChampionRunePageDetailOut(BaseModel):
    champion_id: int
    primary_style: int
    primary_style_icon_url: str | None
    sub_style: int
    sub_style_icon_url: str | None
    all_style_ids: list[int]
    all_style_icon_urls: dict[int, str | None]
    primary_rows: list[RuneRowOut]
    secondary_rows: list[RuneRowOut]
    games: int


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
