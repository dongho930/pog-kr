import { LiveGameDetailParticipant } from "@/lib/api";

const TIER_KOREAN: Record<string, string> = {
  IRON: "아이언",
  BRONZE: "브론즈",
  SILVER: "실버",
  GOLD: "골드",
  PLATINUM: "플래티넘",
  EMERALD: "에메랄드",
  DIAMOND: "다이아몬드",
  MASTER: "마스터",
  GRANDMASTER: "그랜드마스터",
  CHALLENGER: "챌린저",
};

function formatDuration(seconds?: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function teamTierAverage(team: LiveGameDetailParticipant[]): string {
  const tiers = team.map((p) => p.tier).filter((t): t is string => !!t);
  if (tiers.length === 0) return "정보 없음";
  // 가장 흔한 티어를 대표값으로 (평균 점수 계산은 과할 것 같아 최빈값으로 단순화)
  const counts = new Map<string, number>();
  for (const t of tiers) counts.set(t, (counts.get(t) ?? 0) + 1);
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return TIER_KOREAN[top] ?? top;
}

function TeamTable({
  team,
  label,
  color,
}: {
  team: LiveGameDetailParticipant[];
  label: string;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <p className={`text-sm font-bold ${color}`}>{label}</p>
        <p className="text-xs text-text-faint">
          티어 평균: <span className="font-semibold text-text-muted">{teamTierAverage(team)}</span>
        </p>
      </div>
      <div className="space-y-1.5">
        {team.map((p) => (
          <div
            key={p.puuid}
            className="grid grid-cols-[2fr_1.3fr_1.6fr] items-center gap-3 rounded-md bg-base-elevated px-3 py-2"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="relative h-10 w-10 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.champion_icon_url}
                  alt=""
                  className="h-10 w-10 rounded-md bg-base-surface object-cover"
                />
                {p.profile_icon_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.profile_icon_url}
                    alt=""
                    className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border border-base-elevated object-cover"
                  />
                )}
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-0.5">
                {[p.spell1_icon_url, p.spell2_icon_url, p.keystone_icon_url, p.sub_style_icon_url].map(
                  (url, i) => (
                    <div key={i} className="h-4 w-4 overflow-hidden rounded bg-base-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
                    </div>
                  )
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {p.game_name}
                  <span className="text-text-faint"> #{p.tag_line}</span>
                </p>
                <p className="text-[11px] text-text-faint">Level {p.summoner_level ?? "-"}</p>
              </div>
            </div>

            <div className="text-xs text-text-muted">
              {p.tier ? (
                <>
                  <p className="font-semibold text-accent-gold">
                    {TIER_KOREAN[p.tier] ?? p.tier} ({p.lp}LP)
                  </p>
                  <p>
                    {p.season_wins + p.season_losses > 0
                      ? `${Math.round(
                          (p.season_wins / (p.season_wins + p.season_losses)) * 100
                        )}% (${p.season_wins + p.season_losses}게임)`
                      : "-"}
                  </p>
                </>
              ) : (
                <p>티어 정보 없음</p>
              )}
            </div>

            <div className="text-xs text-text-muted">
              {p.champion_games > 0 ? (
                <>
                  <p>
                    <span className="font-semibold text-text-primary">{p.champion_win_rate}%</span> (
                    {p.champion_games}게임) ·{" "}
                    <span className="font-semibold text-accent-win">{p.champion_kda?.toFixed(2)}:1</span>{" "}
                    평점
                  </p>
                  <p>
                    {p.champion_kills} / {p.champion_deaths} / {p.champion_assists}
                  </p>
                </>
              ) : (
                <p>이 챔피언 기록 없음</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveGameDetailPanel({
  queueLabel,
  mapLabel,
  gameLengthSeconds,
  participants,
  spectate,
}: {
  queueLabel?: string;
  mapLabel?: string;
  gameLengthSeconds?: number;
  participants: LiveGameDetailParticipant[];
  spectate?: { game_id: number; platform_id: string; encryption_key: string };
}) {
  const blueTeam = participants.filter((p) => p.team_id === 100);
  const redTeam = participants.filter((p) => p.team_id === 200);

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-base-border px-5 py-4 pr-14">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent-win" />
        <p className="text-sm font-semibold text-text-primary">{queueLabel}</p>
        <span className="text-text-faint">·</span>
        <p className="text-sm text-text-muted">{mapLabel}</p>
        <span className="text-text-faint">·</span>
        <p className="font-mono text-sm text-text-muted">{formatDuration(gameLengthSeconds)}</p>
      </div>

      <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
        <TeamTable team={blueTeam} label="블루팀" color="text-blue-400" />
        <TeamTable team={redTeam} label="레드팀" color="text-accent-loss" />

        {spectate && (
          <div className="rounded-md bg-base-elevated p-3 text-xs text-text-faint">
            <p className="mb-1 font-semibold text-text-muted">관전 정보 (고급 사용자용)</p>
            <p>게임 ID: {spectate.game_id}</p>
            <p>플랫폼: {spectate.platform_id}</p>
            <p className="truncate">암호화 키: {spectate.encryption_key}</p>
            <p className="mt-1.5">
              이 정보는 League 클라이언트로 직접 관전할 때 필요한 값이에요. 브라우저에서 바로
              재생되진 않고, 클라이언트 버전에 따라 연결 방법이 달라질 수 있어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
