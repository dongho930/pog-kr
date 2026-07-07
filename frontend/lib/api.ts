const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export interface Summoner {
  puuid: string;
  game_name: string;
  tag_line: string;
  platform_region: string;
  profile_icon_id: number;
  profile_icon_url: string;
  summoner_level: number;
  solo_tier: string | null;
  solo_rank: string | null;
  solo_lp: number;
  solo_wins: number;
  solo_losses: number;
}

export interface ItemTimelineEntry {
  item_id: number;
  timestamp: number;
  item_icon_url: string | null;
}

export interface MatchParticipant {
  puuid: string;
  champion_id: number;
  champion_icon_url: string;
  team_position: string;
  team_id: number;
  game_name: string;
  tag_line: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold_earned: number;
  champion_level: number;
  damage_dealt: number;
  damage_taken: number;
  items: number[];
  item_icon_urls: (string | null)[];
  highlight_item_icon_url: string | null;
  runes: Record<string, unknown>;
  skill_order: { level: number; skill: string; timestamp: number }[];
  item_timeline: ItemTimelineEntry[];
  summoner1_id: number;
  summoner2_id: number;
  spell1_icon_url: string | null;
  spell2_icon_url: string | null;
  keystone_icon_url: string | null;
  sub_style_icon_url: string | null;
  primary_style_icon_url: string | null;
  primary_rune_icon_urls: (string | null)[];
  secondary_rune_icon_urls: (string | null)[];
  vision_score: number;
  vision_wards_bought: number;
  double_kills: number;
  triple_kills: number;
  quadra_kills: number;
  penta_kills: number;
}

export interface TeamObjectives {
  baron: number;
  dragon: number;
  tower: number;
  herald: number;
  inhibitor: number;
}

export interface Match {
  match_id: string;
  queue_id: number;
  game_duration: number;
  game_creation: string;
  patch: string;
  team_objectives: Record<string, TeamObjectives>;
  participants: MatchParticipant[];
}

export interface ChampionStat {
  champion_id: number;
  champion_name: string;
  champion_icon_url: string;
  patch: string;
  position: string;
  tier: string;
  win_rate: number;
  pick_rate: number;
  ban_rate: number;
  sample_size: number;
  games: number;
  wins: number;
  losses: number;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  cs_per_min: number;
  double_kills: number;
  triple_kills: number;
  quadra_kills: number;
  penta_kills: number;
}

export interface ParticipantRank {
  puuid: string;
  tier: string | null;
  rank: string | null;
  level: number | null;
}

export interface ChampionBuildStat {
  item_ids: (number | string)[];
  games: number;
  win_rate: number;
  pick_rate: number;
  icon_url?: string | null;
  icon_urls?: (string | null)[] | null;
  primary_style_icon_url?: string | null;
  sub_style_icon_url?: string | null;
}

export interface ChampionBuild {
  champion_id: number;
  champion_name: string;
  champion_icon_url: string;
  games: number;
  win_rate: number;
  rune_page_stats: ChampionBuildStat[];
  keystone_stats: ChampionBuildStat[];
  secondary_rune_stats: ChampionBuildStat[];
  spell_stats: ChampionBuildStat[];
  skill_order_stats: ChampionBuildStat[];
  full_skill_order: (string | null)[];
  boots_stats: ChampionBuildStat[];
  trinket_stats: ChampionBuildStat[];
  core_item_stats: ChampionBuildStat[];
}

export interface LeaderboardEntry {
  rank: number;
  puuid: string;
  game_name: string;
  tag_line: string;
  tier: string;
  lp: number;
  wins: number;
  losses: number;
  win_rate: number;
}

export interface LiveGame {
  in_game: boolean;
  game_mode?: string;
  game_length_seconds?: number;
  participants: {
    puuid: string;
    game_name: string;
    tag_line: string;
    champion_id: number;
    champion_icon_url: string;
    team_id: number;
  }[];
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.detail ?? "";
    } catch {
      // 응답 본문이 JSON이 아닌 경우 무시하고 기본 메시지 사용
    }
    throw new Error(detail || `API 요청 실패 (${res.status}): ${path}`);
  }
  return res.json();
}

export const api = {
  getSummoner: (region: string, gameName: string, tagLine: string) =>
    apiFetch<Summoner>(
      `/summoners/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    ),
  getMatchHistory: (puuid: string, count = 20) =>
    apiFetch<Match[]>(`/summoners/${puuid}/matches?count=${count}`),
  getMatchDetail: (matchId: string) => apiFetch<Match>(`/matches/${matchId}`),
  getMatchRanks: (matchId: string) => apiFetch<ParticipantRank[]>(`/matches/${matchId}/ranks`),
  getLiveGame: (puuid: string) => apiFetch<LiveGame>(`/summoners/${puuid}/live`),
  getTierList: (patch: string, position?: string, queueIds?: number[]) =>
    apiFetch<ChampionStat[]>(
      `/champions?patch=${patch}${position ? `&position=${position}` : ""}${
        queueIds && queueIds.length ? `&queue_ids=${queueIds.join(",")}` : ""
      }`
    ),
  getChampionStatsBySummoner: (puuid: string, queueIds?: number[]) =>
    apiFetch<ChampionStat[]>(
      `/champions/by-summoner/${puuid}${queueIds && queueIds.length ? `?queue_ids=${queueIds.join(",")}` : ""}`
    ),
  getLeaderboard: (tier: string, queue: string, limit = 50) =>
    apiFetch<LeaderboardEntry[]>(`/leaderboard?tier=${tier}&queue=${queue}&limit=${limit}`),
  getChampionBuild: (
    championId: number,
    options?: { position?: string; queueIds?: number[]; minTier?: string }
  ) => {
    const params = new URLSearchParams();
    if (options?.position) params.set("position", options.position);
    if (options?.queueIds?.length) params.set("queue_ids", options.queueIds.join(","));
    if (options?.minTier) params.set("min_tier", options.minTier);
    const qs = params.toString();
    return apiFetch<ChampionBuild>(`/champions/${championId}/build${qs ? `?${qs}` : ""}`);
  },
};
