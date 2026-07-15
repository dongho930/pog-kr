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
  const counts = new Map<string, number>();
  for (const t of tiers) counts.set(t, (counts.get(t) ?? 0) + 1);
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return TIER_KOREAN[top] ?? top;
}

function TeamTable({
  team,
  label,
  color,
  bans,
}: {
  team: LiveGameDetailParticipant[];
  label: string;
  color: string;
  bans?: string[];
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-3">
        <p className={`text-xs font-bold ${color}`}>{label}</p>
        <p className="text-[11px] text-text-faint">
          티어 평균: <span className="font-semibold text-text-muted">{teamTierAverage(team)}</span>
        </p>
        {bans && bans.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-text-faint">밴</span>
            {bans.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" className="h-4 w-4 rounded bg-base-elevated grayscale" />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[2fr_0.9fr_0.9fr_1.1fr_0.6fr] gap-2 px-2.5 pb-1 text-[10px] text-text-faint">
        <span>소환사</span>
        <span>티어</span>
        <span>승률</span>
        <span>S2026 챔피언 통계</span>
        <span>룬</span>
      </div>

      <div className="space-y-1">
        {team.map((p) => (
          <div
            key={p.puuid}
            className="grid grid-cols-[2fr_0.9fr_0.9fr_1.1fr_0.6fr] items-center gap-2 rounded-md bg-base-elevated px-2.5 py-1.5"
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              <div className="relative h-8 w-8 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.champion_icon_url}
                  alt=""
                  className="h-8 w-8 rounded-md bg-base-surface object-cover"
                />
                {p.profile_icon_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.profile_icon_url}
                    alt=""
                    className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border border-base-elevated object-cover"
                  />
                )}
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-0.5">
                {[p.spell1_icon_url, p.spell2_icon_url].map((url, i) => (
                  <div key={i} className="h-3 w-3 overflow-hidden rounded bg-base-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {url && <img src={url} alt="" className="h-full w-full object-cover" />}
                  </div>
                ))}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-text-primary">
                  {p.game_name}
                  <span className="text-text-faint"> #{p.tag_line}</span>
                </p>
                <p className="text-[10px] text-text-faint">Lv.{p.summoner_level ?? "-"}</p>
              </div>
            </div>

            <div className="text-[11px] text-text-muted">
              {p.tier ? (
                <>
                  <p className="font-semibold text-accent-gold">{TIER_KOREAN[p.tier] ?? p.tier}</p>
                  <p>{p.lp}LP</p>
                </>
              ) : (
                <p>정보 없음</p>
              )}
            </div>

            <div className="text-[11px] text-text-muted">
              {p.season_wins + p.season_losses > 0 ? (
                <>
                  <p className="font-semibold text-text-primary">
                    {Math.round((p.season_wins / (p.season_wins + p.season_losses)) * 100)}%
                  </p>
                  <p>{p.season_wins + p.season_losses}게임</p>
                </>
              ) : (
                <p>-</p>
              )}
            </div>

            <div className="text-[11px] text-text-muted">
              {p.champion_games > 0 ? (
                <>
                  <p>
                    <span className="font-semibold text-text-primary">{p.champion_win_rate}%</span> (
                    {p.champion_games})
                  </p>
                  <p>
                    <span className="text-accent-win">{p.champion_kda?.toFixed(2)}:1</span> ·{" "}
                    {p.champion_kills}/{p.champion_deaths}/{p.champion_assists}
                  </p>
                </>
              ) : (
                <p>기록 없음</p>
              )}
            </div>

            <div className="flex gap-0.5">
              {[p.keystone_icon_url, p.sub_style_icon_url].map((url, i) => (
                <div key={i} className="h-5 w-5 overflow-hidden rounded-full bg-base-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {url && <img src={url} alt="" className="h-full w-full object-cover" />}
                </div>
              ))}
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
  bans,
  spectate,
}: {
  queueLabel?: string;
  mapLabel?: string;
  gameLengthSeconds?: number;
  participants: LiveGameDetailParticipant[];
  bans?: Record<string, string[]>;
  spectate?: { game_id: number; platform_id: string; encryption_key: string };
}) {
  const blueTeam = participants.filter((p) => p.team_id === 100);
  const redTeam = participants.filter((p) => p.team_id === 200);

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-base-border px-5 py-3 pr-14">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent-win" />
        <p className="text-sm font-semibold text-text-primary">{queueLabel}</p>
        <span className="text-text-faint">·</span>
        <p className="text-sm text-text-muted">{mapLabel}</p>
        <span className="text-text-faint">·</span>
        <p className="font-mono text-sm text-text-muted">{formatDuration(gameLengthSeconds)}</p>
      </div>

      <div className="max-h-[80vh] space-y-4 overflow-y-auto p-4">
        <TeamTable team={blueTeam} label="블루팀" color="text-blue-400" bans={bans?.["100"]} />
        <TeamTable team={redTeam} label="레드팀" color="text-accent-loss" bans={bans?.["200"]} />

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
