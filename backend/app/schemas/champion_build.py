from pydantic import BaseModel, computed_field

from app.services import ddragon


class ChampionBuildOut(BaseModel):
    champion_id: int
    champion_name: str
    games: int
    win_rate: float

    core_item_ids: list[int]
    boots_item_id: int | None
    trinket_item_id: int | None
    keystone_id: int | None
    primary_style_id: int | None
    sub_style_id: int | None
    primary_minor_rune_ids: list[int]
    secondary_rune_ids: list[int]
    spell_ids: list[int]
    skill_priority: list[str]

    @computed_field
    @property
    def champion_icon_url(self) -> str:
        return ddragon.champion_icon_url(self.champion_id)

    @computed_field
    @property
    def core_item_icon_urls(self) -> list[str | None]:
        return [ddragon.item_icon_url(i) for i in self.core_item_ids]

    @computed_field
    @property
    def boots_icon_url(self) -> str | None:
        return ddragon.item_icon_url(self.boots_item_id) if self.boots_item_id else None

    @computed_field
    @property
    def trinket_icon_url(self) -> str | None:
        return ddragon.item_icon_url(self.trinket_item_id) if self.trinket_item_id else None

    @computed_field
    @property
    def keystone_icon_url(self) -> str | None:
        return ddragon.rune_icon_url(self.keystone_id)

    @computed_field
    @property
    def primary_style_icon_url(self) -> str | None:
        return ddragon.rune_style_icon_url(self.primary_style_id)

    @computed_field
    @property
    def sub_style_icon_url(self) -> str | None:
        return ddragon.rune_style_icon_url(self.sub_style_id)

    @computed_field
    @property
    def primary_minor_rune_icon_urls(self) -> list[str | None]:
        return [ddragon.rune_icon_url(i) for i in self.primary_minor_rune_ids]

    @computed_field
    @property
    def secondary_rune_icon_urls(self) -> list[str | None]:
        return [ddragon.rune_icon_url(i) for i in self.secondary_rune_ids]

    @computed_field
    @property
    def spell_icon_urls(self) -> list[str | None]:
        return [ddragon.spell_icon_url(i) for i in self.spell_ids]
