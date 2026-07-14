import { ChampionBuildStat } from "@/lib/api";

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
    <div className="overflow-hidden rounded-card border border-base-border">
      <div className="bg-base-elevated px-4 py-2 text-sm font-semibold text-text-primary">
        {title}
      </div>
      <div className="flex items-center justify-end gap-5 border-b border-base-border bg-base-surface px-4 py-1.5 text-xs text-text-faint">
        <span className="w-12 text-right">게임</span>
        <span className="w-12 text-right">픽률</span>
        <span className="w-12 text-right">승률</span>
      </div>
      <div className="divide-y divide-base-border bg-base-surface">
        {list.map((stat, i) => {
          const label = renderLabel?.(stat);
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex shrink-0 items-center gap-1">{renderIcons(stat)}</div>
              {label ? (
                <span className="flex-1 truncate text-sm text-text-primary">{label}</span>
              ) : (
                <div className="flex-1" />
              )}
              <span className="w-12 text-right font-mono text-sm text-text-muted">
                {stat.games.toLocaleString()}
              </span>
              <span className="w-12 text-right font-mono text-sm text-text-muted">
                {stat.pick_rate.toFixed(1)}%
              </span>
              <span
                className={`w-12 text-right font-mono text-sm font-semibold ${
                  stat.win_rate >= 50 ? "text-accent-win" : "text-accent-loss"
                }`}
              >
                {stat.win_rate.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
