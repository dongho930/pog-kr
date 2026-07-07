import { LiveGame } from "@/lib/api";

export function LiveGameBanner({ game }: { game: LiveGame }) {
  if (!game.in_game) {
    return (
      <div className="rounded-card border border-base-border bg-base-surface p-4 text-sm text-text-muted">
        현재 게임 중이 아닙니다.
      </div>
    );
  }

  const blueTeam = game.participants.filter((p) => p.team_id === 100);
  const redTeam = game.participants.filter((p) => p.team_id === 200);

  return (
    <div className="rounded-card border border-accent-win/40 bg-base-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent-win" />
        <p className="text-sm font-semibold text-accent-win">
          게임 진행 중 · {game.game_mode} · {Math.floor((game.game_length_seconds ?? 0) / 60)}분 경과
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TeamList label="블루팀" team={blueTeam} color="text-blue-400" />
        <TeamList label="레드팀" team={redTeam} color="text-accent-loss" />
      </div>
    </div>
  );
}

function TeamList({
  label,
  team,
  color,
}: {
  label: string;
  team: LiveGame["participants"];
  color: string;
}) {
  return (
    <div>
      <p className={`mb-1.5 text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</p>
      <ul className="space-y-1">
        {team.map((p) => (
          <li key={p.puuid} className="flex items-center gap-2 text-sm text-text-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.champion_icon_url}
              alt={`champion-${p.champion_id}`}
              className="h-5 w-5 rounded-full bg-base-elevated object-cover"
            />
            {p.game_name}#{p.tag_line}
          </li>
        ))}
      </ul>
    </div>
  );
}
