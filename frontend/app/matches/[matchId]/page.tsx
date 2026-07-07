import { api } from "@/lib/api";
import { BuildTimeline } from "@/components/BuildTimeline";

export default async function MatchDetailPage({
  params,
}: {
  params: { matchId: string };
}) {
  const match = await api.getMatchDetail(params.matchId);

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-text-primary">매치 상세</h1>
      <p className="mb-6 text-sm text-text-faint">
        패치 {match.patch} · {Math.floor(match.game_duration / 60)}분
      </p>

      <div className="space-y-8">
        {match.participants.map((p) => (
          <div
            key={p.puuid}
            className={`rounded-card border-l-4 bg-base-surface p-5 ${
              p.win ? "border-l-accent-win" : "border-l-accent-loss"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.champion_icon_url}
                  alt={`champion-${p.champion_id}`}
                  className="h-9 w-9 rounded-md bg-base-elevated object-cover"
                />
                <div>
                  <p className="font-mono text-sm text-text-primary">
                    {p.kills} / <span className="text-accent-loss">{p.deaths}</span> / {p.assists}
                  </p>
                  <p className="text-xs text-text-muted">{p.team_position}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${p.win ? "text-accent-win" : "text-accent-loss"}`}>
                {p.win ? "승리" : "패배"}
              </span>
            </div>
            <BuildTimeline participant={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
