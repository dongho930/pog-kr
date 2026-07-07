import { ChampionBuildStat } from "@/lib/api";

function StatRow({
  stat,
  icons,
  label,
}: {
  stat: ChampionBuildStat;
  icons: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-base-border bg-base-elevated px-3 py-2">
      <div className="flex shrink-0 items-center gap-1">{icons}</div>
      {label && <span className="flex-1 truncate text-sm text-text-primary">{label}</span>}
      {!label && <div className="flex-1" />}
      <div className="w-16 shrink-0 text-right">
        <p className="text-xs text-text-faint">게임</p>
        <p className="font-mono text-sm text-text-muted">{stat.games.toLocaleString()}</p>
      </div>
      <div className="w-16 shrink-0 text-right">
        <p className="text-xs text-text-faint">픽률</p>
        <p className="font-mono text-sm text-text-muted">{stat.pick_rate.toFixed(1)}%</p>
      </div>
      <div className="w-16 shrink-0 text-right">
        <p className="text-xs text-text-faint">승률</p>
        <p
          className={`font-mono text-sm font-semibold ${
            stat.win_rate >= 50 ? "text-accent-win" : "text-accent-loss"
          }`}
        >
          {stat.win_rate.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

export function Icon({
  url,
  size = "h-8 w-8",
  rounded = "rounded",
}: {
  url?: string | null;
  size?: string;
  rounded?: string;
}) {
  return (
    <div className={`${size} overflow-hidden ${rounded} bg-base-surface`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </div>
  );
}

export function StatSection({
  title,
  stats,
  renderIcons,
  renderLabel,
}: {
  title: string;
  stats?: ChampionBuildStat[];
  renderIcons: (stat: ChampionBuildStat) => React.ReactNode;
  renderLabel?: (stat: ChampionBuildStat) => string | undefined;
}) {
  const list = stats ?? [];
  if (list.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-text-muted">{title}</h2>
      <div className="space-y-1.5">
        {list.map((stat, i) => (
          <StatRow key={i} stat={stat} icons={renderIcons(stat)} label={renderLabel?.(stat)} />
        ))}
      </div>
    </section>
  );
}
