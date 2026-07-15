import { LiveGameDetailParticipant } from "@/lib/api";
import { tierEmblemUrl } from "@/lib/rankIcons";

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

function summonerHref(gameName: string, tagLine: string): string {
  return `/summoners/kr/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;
}

/** 아이콘 로드가 실패하면(존재하지 않는 챔피언 ID 등) 깨진 이미지 대신 숨겨서 빈 박스로만 남긴다. */
function hideOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.visibility = "hidden";
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
      <div className="mb-1 flex items-center gap-3">
        <p className={`text-xs font-bold ${color}`}>{label}</p>
        <p className="text-[11px] text-text-faint">
          티어 평균: <span className="font-semibold text-text-muted">{teamTierAverage(team)}</span>
        </p>
        {bans && bans.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-text-faint">밴</span>
            {bans.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                onError={hideOnError}
                className="h-7 w-7 rounded bg-base-elevated grayscale"
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[2fr_0.9fr_0.9fr_1.1fr] gap-2 px-2 pb-0.5 text-[10px] text-text-faint">
        <span>소환사</span>
        <span>티어</span>
        <span>승률</span>
        <span>S2026 챔피언 통계</span>
      </div>

      <div className="space-y-0.5">
        {team.map((p) => {
          const emblemUrl = tierEmblemUrl(p.tier);
          return (
            <div
              key={p.puuid}
              className="grid grid-cols-[2fr_0.9fr_0.9fr_1.1fr] items-center gap-2 rounded-md bg-base-elevated px-2 py-1 leading-tight"
            >
              <div className="flex items-center gap-1 overflow-hidden">
                <div className="relative h-7 w-7 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.champion_icon_url}
                    alt=""
                    onError={hideOnError}
                    className="h-7 w-7 rounded-md bg-base-surface object-cover"
                  />
                  {p.profile_icon_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.profile_icon_url}
                      alt=""
                      onError={hideOnError}
                      className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-base-elevated object-cover"
                    />
                  )}
                </div>
                {/* 스펠(위) + 룬: 키스톤/보조트리(아래) 2x2 배치 */}
                <div className="grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 leading-none">
                  {[p.spell1_icon_url, p.spell2_icon_url, p.keystone_icon_url, p.sub_style_icon_url].map(
                    (url, i) => (
                      <div key={i} className="h-3 w-3 overflow-hidden rounded bg-base-surface">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {url && (
                          <img src={url} alt="" onError={hideOnError} className="h-full w-full object-cover" />
                        )}
                      </div>
                    )
                  )}
                </div>
                <div className="min-w-0">
                  {p.game_name && p.tag_line ? (
                    <a
                      href={summonerHref(p.game_name, p.tag_line)}
                      className="truncate text-xs font-semibold text-text-primary hover:underline"
                    >
                      {p.game_name}
                      <span className="text-text-faint"> #{p.tag_line}</span>
                    </a>
                  ) : (
                    <p className="truncate text-xs font-semibold text-text-primary">
                      {p.game_name || "(알 수 없음)"}
                    </p>
                  )}
                  <p className="text-[9px] text-text-faint leading-tight">Lv.{p.summoner_level ?? "-"}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-text-muted leading-tight">
                {emblemUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={emblemUrl} alt="" onError={hideOnError} className="h-5 w-5 object-contain" />
                )}
                {p.tier ? (
                  <div>
                    <p className="font-semibold text-accent-gold">{TIER_KOREAN[p.tier] ?? p.tier}</p>
                    <p>{p.lp}LP</p>
                  </div>
                ) : (
                  <p>정보 없음</p>
                )}
              </div>

              <div className="text-[10px] leading-tight text-text-muted">
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

              <div className="text-[10px] leading-tight text-text-muted">
                {p.champion_games > 0 ? (
                  <>
                    <p>
                      <span className="font-semibold text-text-primary">{p.champion_win_rate}%</span> (
                      {p.champion_games})
                    </p>
                    <p>
                      <span className="text-accent-win">{p.champion_kda?.toFixed(2)}:1</span> ·{" "}
                      {p.champion_kills?.toFixed(1)}/{p.champion_deaths?.toFixed(1)}/
                      {p.champion_assists?.toFixed(1)}
                    </p>
                  </>
                ) : (
                  <p>기록 없음</p>
                )}
              </div>
            </div>
          );
        })}
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
      <div className="flex items-center gap-2 border-b border-base-border px-5 py-2.5 pr-14">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent-win" />
        <p className="text-sm font-semibold text-text-primary">{queueLabel}</p>
        <span className="text-text-faint">·</span>
        <p className="text-sm text-text-muted">{mapLabel}</p>
        <span className="text-text-faint">·</span>
        <p className="font-mono text-sm text-text-muted">{formatDuration(gameLengthSeconds)}</p>
      </div>

      <div className="max-h-[88vh] space-y-3 overflow-y-auto p-3.5">
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
