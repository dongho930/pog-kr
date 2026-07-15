"""
티어+분할(디비전)+LP를 그래프에 그리기 좋은 하나의 연속된 점수로 변환한다.

예: 골드 II 30LP -> (GOLD는 3번째) 3*400 + (II는 2번째 분할) 2*100 + 30 = 1430
분할 하나를 대략 100점(=승급에 필요한 LP 근사치)으로 잡아서, 승급/강등을
거치며 티어가 바뀌어도 그래프가 뚝뚝 끊기지 않고 자연스럽게 이어지도록 한다.
마스터 이상은 분할이 없으므로 LP를 그대로 더한다.
"""

TIER_ORDER = [
    "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD",
    "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER",
]
RANK_ORDER = {"IV": 0, "III": 1, "II": 2, "I": 3}
POINTS_PER_DIVISION = 100
POINTS_PER_TIER = 4 * POINTS_PER_DIVISION


def rank_to_score(tier: str | None, rank: str | None, lp: int) -> int:
    if not tier or tier not in TIER_ORDER:
        return 0

    tier_index = TIER_ORDER.index(tier)
    base = tier_index * POINTS_PER_TIER

    if tier in ("MASTER", "GRANDMASTER", "CHALLENGER"):
        # 마스터 이상부터는 분할이 없으니, 마스터 시작점 기준으로 LP를 그대로 더한다.
        master_base = TIER_ORDER.index("MASTER") * POINTS_PER_TIER
        return master_base + lp

    rank_index = RANK_ORDER.get(rank or "IV", 0)
    return base + rank_index * POINTS_PER_DIVISION + lp
