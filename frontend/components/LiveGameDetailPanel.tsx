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
  GRANDMASTER: "그마",
  CHALLENGER: "챌린저",
};

function formatDuration(seconds?: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
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
      <p className={`mb-1.5 text-xs font-bold uppercase tracking-wide ${color}`}>{label}</p>
      <div className="space-y-1">
        {team.map((p) => (
          <div
            key={p.puuid}
            className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md bg-base-elevated px-2 py-1.5"
          >
            <div className="flex items-center gap-1.5">
              <div className="relative h-9 w-9 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.champion_icon_url}
                  alt=""
                  className="h-9 w-9 rounded-md bg-base-surface object-cover"
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
              <div className="grid grid-cols-2 gap-0.5">
                {[p.spell1_icon_url, p.spell2_icon_url, p.keystone_icon_url, p.sub_style_icon_url].map(
                  (url, i) => (
                    <div key={i} className="h-3.5 w-3.5 overflow-hidden rounded bg-base-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-text-primary">
                {p.game_name}
                <span className="text-text-faint"> #{p.tag_line}</span>
              </p>
              <p className="text-[10px] text-text-faint">Lv.{p.summoner_level ?? "-"}</p>
            </div>

            <div className="text-right text-[10px] text-text-muted">
              {p.tier ? (
                <>
                  <p className="font-semibold text-accent-gold">
                    {TIER_KOREAN[p.tier] ?? p.tier} {p.rank} {p.lp}LP
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
                <p>-</p>
              )}
            </div>

            <div className="text-right text-[10px] text-text-muted">
              {p.champion_games > 0 ? (
                <>
                  <p className="font-semibold text-text-primary">
                    {p.champion_win_rate}% ({p.champion_games})
                  </p>
                  <p>
                    {p.champion_kda?.toFixed(2)}:1 · {p.champion_kills}/{p.champion_deaths}/
                    {p.champion_assists}
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
}: {
  queueLabel?: string;
  mapLabel?: string;
  gameLengthSeconds?: number;
  participants: LiveGameDetailParticipant[];
}) {
  const blueTeam = participants.filter((p) => p.team_id === 100);
  const redTeam = participants.filter((p) => p.team_id === 200);

  return (
    <div className="rounded-md border border-base-border bg-base-surface p-3">
      <p className="mb-2 text-xs text-text-muted">
        <span className="font-semibold text-text-primary">{queueLabel}</span> · {mapLabel} ·{" "}
        {formatDuration(gameLengthSeconds)}
      </p>
      <div className="space-y-3">
        <TeamTable team={blueTeam} label="블루팀" color="text-blue-400" />
        <TeamTable team={redTeam} label="레드팀" color="text-accent-loss" />
      </div>
    </div>
  );
}
