from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from app.services import ddragon


class SkillOrderEntry(BaseModel):
    level: int
    skill: str          # "Q" | "W" | "E" | "R"
    timestamp: int       # 초 단위


class ItemTimelineEntry(BaseModel):
    item_id: int
    timestamp: int

    @computed_field
    @property
    def item_icon_url(self) -> str | None:
        return ddragon.item_icon_url(self.item_id)


class MatchParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    puuid: str
    champion_id: int
    team_position: str
    team_id: int
    game_name: str
    tag_line: str
    win: bool
    kills: int
    deaths: int
    assists: int
    cs: int
    gold_earned: int
    champion_level: int
    damage_dealt: int
    damage_taken: int
    items: list[int]
    runes: dict
    skill_order: list[SkillOrderEntry]
    item_timeline: list[ItemTimelineEntry]
    summoner1_id: int
    summoner2_id: int
    vision_score: int
    vision_wards_bought: int

    @computed_field
    @property
    def champion_icon_url(self) -> str:
        return ddragon.champion_icon_url(self.champion_id)

    @computed_field
    @property
    def item_icon_urls(self) -> list[str | None]:
        return [ddragon.item_icon_url(item_id) for item_id in self.items]

    @computed_field
    @property
    def highlight_item_icon_url(self) -> str | None:
        """
        2행 4번째 칸에 강조 표시할 "라인별 특별 아이템".
        서포터(UTILITY)는 퀘스트템(재물 공유/룬 나침반/세계의 결실 등), 그
        외 라인은 신발을 강조한다 — 탑/정글/미드/원딜의 2026 역할 퀘스트는
        슬롯/스탯 보너스라 아이콘으로 보여줄 실제 아이템이 없다.
        """
        if self.team_position == "UTILITY":
            for item_id in self.items[:6]:
                if ddragon.is_support_quest_item(item_id):
                    return ddragon.item_icon_url(item_id)
            return None
        for item_id in self.items[:6]:
            if ddragon.is_boots(item_id):
                return ddragon.item_icon_url(item_id)
        return None

    @computed_field
    @property
    def spell1_icon_url(self) -> str | None:
        return ddragon.spell_icon_url(self.summoner1_id)

    @computed_field
    @property
    def spell2_icon_url(self) -> str | None:
        return ddragon.spell_icon_url(self.summoner2_id)

    @computed_field
    @property
    def keystone_icon_url(self) -> str | None:
        return ddragon.rune_icon_url(self.runes.get("keystone"))

    @computed_field
    @property
    def sub_style_icon_url(self) -> str | None:
        return ddragon.rune_style_icon_url(self.runes.get("sub_style"))


class MatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    match_id: str
    queue_id: int
    game_duration: int
    game_creation: datetime
    patch: str
    team_objectives: dict
    participants: list[MatchParticipantOut]


class LiveGameParticipant(BaseModel):
    puuid: str
    game_name: str
    tag_line: str
    champion_id: int
    team_id: int  # 100 | 200

    @computed_field
    @property
    def champion_icon_url(self) -> str:
        return ddragon.champion_icon_url(self.champion_id)


class LiveGameOut(BaseModel):
    in_game: bool
    game_mode: str | None = None
    game_length_seconds: int | None = None
    participants: list[LiveGameParticipant] = []
