import { ChampionBuildStat } from "@/lib/api";

function RuneOptionCard({ stat }: { stat: ChampionBuildStat }) {
  const url = stat.icon_url;
  return (
    <div className="flex w-16 flex-col items-center gap-1">
      <div className="h-9 w-9 overflow-hidden rounded-full border border-base-border bg-base-elevated">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      </div>
      <p
        className={`font-mono text-xs font-bold ${
          stat.win_rate >= 50 ? "text-accent-win" : "text-accent-loss"
        }`}
      >
        {stat.win_rate.toFixed(1)}%
      </p>
      <p className="font-mono text-[10px] text-text-faint">{stat.pick_rate.toFixed(1)}%</p>
      <p className="font-mono text-[10px] text-text-faint">{stat.games.toLocaleString()}</p>
    </div>
  );
}

function RuneSlotRow({ stats }: { stats: ChampionBuildStat[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="flex gap-3">
      {stats.map((stat, i) => (
        <RuneOptionCard key={i} stat={stat} />
      ))}
    </div>
  );
}

function RunePageSummaryCard({ stat, active }: { stat: ChampionBuildStat; active: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border px-4 py-3 ${
        active ? "border-accent-gold/50 bg-base-elevated" : "border-base-border bg-base-surface"
      }`}
    >
      <div className="flex items-center gap-1">
        <div className="h-9 w-9 overflow-hidden rounded-full bg-base-elevated">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {stat.primary_style_icon_url && (
            <img src={stat.primary_style_icon_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="h-6 w-6 overflow-hidden rounded-full bg-base-elevated">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {stat.sub_style_icon_url && (
            <img src={stat.sub_style_icon_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
      </div>
      <div>
        <p className="font-mono text-lg font-bold text-text-primary">
          {stat.pick_rate.toFixed(2)}%
        </p>
        <p className="font-mono text-xs text-text-faint">{stat.games.toLocaleString()} 게임</p>
      </div>
      <p className="ml-2 font-mono text-base font-bold text-accent-win">
        {stat.win_rate.toFixed(2)}%
      </p>
    </div>
  );
}

export function RunePageGrid({
  runePageStats,
  keystoneStats,
  primarySlot1Stats,
  primarySlot2Stats,
  primarySlot3Stats,
  secondaryRuneStats,
}: {
  runePageStats: ChampionBuildStat[];
  keystoneStats: ChampionBuildStat[];
  primarySlot1Stats: ChampionBuildStat[];
  primarySlot2Stats: ChampionBuildStat[];
  primarySlot3Stats: ChampionBuildStat[];
  secondaryRuneStats: ChampionBuildStat[];
}) {
  return (
    <div>
      {/* 가장 많이 쓰인 룬 페이지 조합 요약 */}
      <div className="mb-4 flex flex-wrap gap-3">
        {runePageStats.slice(0, 2).map((stat, i) => (
          <RunePageSummaryCard key={i} stat={stat} active={i === 0} />
        ))}
      </div>

      {/* 트리별 슬롯 행 (주룬: 키스톤+3슬롯, 보조룬: 선택된 룬 전체) */}
      <div className="grid grid-cols-1 gap-6 rounded-card border border-base-border bg-base-surface p-4 md:grid-cols-2">
        <div className="space-y-4">
          <RuneSlotRow stats={keystoneStats} />
          <RuneSlotRow stats={primarySlot1Stats} />
          <RuneSlotRow stats={primarySlot2Stats} />
          <RuneSlotRow stats={primarySlot3Stats} />
          <p className="text-center text-xs text-text-faint">주 룬트리</p>
        </div>
        <div className="space-y-4">
          <RuneSlotRow stats={secondaryRuneStats} />
          <p className="text-center text-xs text-text-faint">보조 룬트리</p>
        </div>
      </div>

      <p className="mt-2 text-xs text-text-faint">
        * 능력치 파편(스탯 샤드)은 아직 수집하고 있지 않아 이번 화면에는 포함되지 않았어요.
      </p>
    </div>
  );
}
