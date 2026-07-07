// Riot의 queue_id를 화면에 보여줄 게임 모드 그룹으로 묶는다.
// 참고: https://static.developer.riotgames.com/docs/lol/queues.json

export type GameModeKey = "ALL" | "SR" | "ARAM" | "URF" | "ARENA";

export interface SubMode {
  key: string;
  label: string;
  queueIds: number[] | null; // null = 상위 모드의 전체 queueIds 사용
}

export interface GameMode {
  key: GameModeKey;
  label: string;
  queueIds: number[] | null; // null = 전체 (필터 없음)
  subModes?: SubMode[];
}

export const GAME_MODES: GameMode[] = [
  { key: "ALL", label: "전체", queueIds: null },
  {
    key: "SR",
    label: "소환사의 협곡",
    // 솔로랭크, 자유랭크, 일반(드래프트/블라인드), 빠른 대전, 격전
    queueIds: [400, 420, 430, 440, 490, 700],
    subModes: [
      { key: "ALL", label: "전체", queueIds: null },
      { key: "NORMAL", label: "일반", queueIds: [400, 430, 490, 700] },
      { key: "SOLO", label: "솔로 랭크", queueIds: [420] },
      { key: "FLEX", label: "자유 랭크", queueIds: [440] },
    ],
  },
  { key: "ARAM", label: "칼바람 나락", queueIds: [450] },
  { key: "URF", label: "우르프", queueIds: [900, 1900] },
  {
    key: "ARENA",
    label: "아레나",
    // 1700/1710: 기존 2v2v2v2 아레나, 1750: 실제 매치 데이터로 확인된
    // 아레나 3x6 큐 (Riot이 큐 ID를 공식 문서로 공개하지 않아 실제 매치
    // 데이터 기준으로 계속 보정 중)
    queueIds: [1700, 1710, 1750],
    subModes: [
      { key: "ALL", label: "전체", queueIds: null },
      { key: "STANDARD", label: "아레나", queueIds: [1700, 1710] },
      { key: "3X6", label: "아레나 3x6", queueIds: [1750] },
    ],
  },
];

export function getGameMode(key: GameModeKey): GameMode {
  return GAME_MODES.find((m) => m.key === key) ?? GAME_MODES[0];
}

/**
 * 선택된 모드 + 서브모드 기준으로 실제 필터에 쓸 queueIds를 계산한다.
 * - 서브모드가 "전체"(queueIds: null)면 상위 모드의 queueIds를 쓴다.
 * - 상위 모드가 "전체"(ALL)면 필터 없음(null)을 반환한다.
 */
export function getEffectiveQueueIds(
  modeKey: GameModeKey,
  subModeKey?: string
): number[] | null {
  const mode = getGameMode(modeKey);
  if (subModeKey && mode.subModes) {
    const sub = mode.subModes.find((s) => s.key === subModeKey);
    if (sub) return sub.queueIds ?? mode.queueIds;
  }
  return mode.queueIds;
}
