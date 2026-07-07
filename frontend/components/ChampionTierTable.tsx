import { ChampionStat } from "@/lib/api";

export function ChampionTierTable({ stats }: { stats: ChampionStat[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-1.5 whitespace-nowrap">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
            <th className="px-3 pb-2">챔피언</th>
            <th className="px-3 pb-2 font-mono">승률</th>
            <th className="px-3 pb-2 font-mono">게임 수</th>
            <th className="px-3 pb-2 font-mono">승리</th>
            <th className="px-3 pb-2 font-mono">패배</th>
            <th className="px-3 pb-2 font-mono">KDA</th>
            <th className="px-3 pb-2 font-mono">킬</th>
            <th className="px-3 pb-2 font-mono">데스</th>
            <th className="px-3 pb-2 font-mono">어시스트</th>
            <th className="px-3 pb-2 font-mono">CS</th>
            <th className="px-3 pb-2 font-mono">분당 CS</th>
            <th className="px-3 pb-2 font-mono">더블 킬</th>
            <th className="px-3 pb-2 font-mono">트리플 킬</th>
            <th className="px-3 pb-2 font-mono">쿼드라 킬</th>
            <th className="px-3 pb-2 font-mono">펜타 킬</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.champion_id} className="bg-base-surface">
              <td className="rounded-l-card px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.champion_icon_url}
                    alt={s.champion_name}
                    className="h-7 w-7 rounded-full bg-base-elevated object-cover"
                  />
                  <span className="text-text-primary">{s.champion_name}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 font-mono text-accent-gold">{s.win_rate.toFixed(1)}%</td>
              <td className="px-3 py-2.5 font-mono text-text-primary">{s.games}</td>
              <td className="px-3 py-2.5 font-mono text-accent-win">{s.wins}</td>
              <td className="px-3 py-2.5 font-mono text-accent-loss">{s.losses}</td>
              <td className="px-3 py-2.5 font-mono text-text-primary">{s.kda.toFixed(2)}</td>
              <td className="px-3 py-2.5 font-mono text-text-muted">{s.kills.toFixed(1)}</td>
              <td className="px-3 py-2.5 font-mono text-text-muted">{s.deaths.toFixed(1)}</td>
              <td className="px-3 py-2.5 font-mono text-text-muted">{s.assists.toFixed(1)}</td>
              <td className="px-3 py-2.5 font-mono text-text-muted">{s.cs.toFixed(1)}</td>
              <td className="px-3 py-2.5 font-mono text-text-muted">{s.cs_per_min.toFixed(1)}</td>
              <td className="px-3 py-2.5 font-mono text-text-muted">{s.double_kills}</td>
              <td className="px-3 py-2.5 font-mono text-text-muted">{s.triple_kills}</td>
              <td className="px-3 py-2.5 font-mono text-text-muted">{s.quadra_kills}</td>
              <td className="rounded-r-card px-3 py-2.5 font-mono text-accent-gold">
                {s.penta_kills}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
