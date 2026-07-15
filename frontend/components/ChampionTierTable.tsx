import { ChampionStat } from "@/lib/api";

export function ChampionTierTable({ stats }: { stats: ChampionStat[] }) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-separate border-spacing-x-1 border-spacing-y-1 text-[11px] whitespace-nowrap">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-text-faint">
            <th className="px-1.5 pb-1">챔피언</th>
            <th className="px-1.5 pb-1 font-mono">게임</th>
            <th className="px-1.5 pb-1 font-mono">승률</th>
            <th className="px-1.5 pb-1 font-mono">KDA</th>
            <th className="px-1.5 pb-1 font-mono">킬</th>
            <th className="px-1.5 pb-1 font-mono">데스</th>
            <th className="px-1.5 pb-1 font-mono">어시</th>
            <th className="px-1.5 pb-1 font-mono">CS</th>
            <th className="px-1.5 pb-1 font-mono">CS/분</th>
            <th className="px-1.5 pb-1 font-mono">더블</th>
            <th className="px-1.5 pb-1 font-mono">트리플</th>
            <th className="px-1.5 pb-1 font-mono">쿼드라</th>
            <th className="px-1.5 pb-1 font-mono">펜타</th>
            <th className="px-1.5 pb-1 font-mono">승</th>
            <th className="px-1.5 pb-1 font-mono">패</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.champion_id} className="bg-base-surface">
              <td className="rounded-l-card py-1.5 pl-1.5 pr-3">
                <div className="flex items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.champion_icon_url}
                    alt={s.champion_name}
                    className="h-5 w-5 shrink-0 rounded-full bg-base-elevated object-cover"
                  />
                  <span className="max-w-[72px] truncate text-xs text-text-primary">
                    {s.champion_name}
                  </span>
                </div>
              </td>
              <td className="px-1.5 py-1.5 font-mono text-text-primary">{s.games}</td>
              <td className="px-1.5 py-1.5 font-mono text-accent-gold">{s.win_rate.toFixed(1)}%</td>
              <td className="px-1.5 py-1.5 font-mono text-text-primary">{s.kda.toFixed(2)}</td>
              <td className="px-1.5 py-1.5 font-mono text-text-muted">{s.kills.toFixed(1)}</td>
              <td className="px-1.5 py-1.5 font-mono text-text-muted">{s.deaths.toFixed(1)}</td>
              <td className="px-1.5 py-1.5 font-mono text-text-muted">{s.assists.toFixed(1)}</td>
              <td className="px-1.5 py-1.5 font-mono text-text-muted">{s.cs.toFixed(1)}</td>
              <td className="px-1.5 py-1.5 font-mono text-text-muted">{s.cs_per_min.toFixed(1)}</td>
              <td className="px-1.5 py-1.5 font-mono text-text-muted">{s.double_kills}</td>
              <td className="px-1.5 py-1.5 font-mono text-text-muted">{s.triple_kills}</td>
              <td className="px-1.5 py-1.5 font-mono text-text-muted">{s.quadra_kills}</td>
              <td className="px-1.5 py-1.5 font-mono text-accent-gold">{s.penta_kills}</td>
              <td className="px-1.5 py-1.5 font-mono text-accent-win">{s.wins}</td>
              <td className="rounded-r-card px-1.5 py-1.5 font-mono text-accent-loss">{s.losses}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
