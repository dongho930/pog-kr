"use client";

import { useState } from "react";
import { ChampionBuildStat } from "@/lib/api";
import { SkillBuildGrid } from "./SkillBuildGrid";

export function SkillBuildSection({
  skillOrderStats,
  defaultFullOrder,
}: {
  skillOrderStats: ChampionBuildStat[];
  defaultFullOrder: (string | null)[];
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const activeOrder =
    selectedIndex !== null
      ? skillOrderStats[selectedIndex]?.full_order ?? defaultFullOrder
      : defaultFullOrder;

  if (skillOrderStats.length === 0) {
    return <SkillBuildGrid fullSkillOrder={defaultFullOrder} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
      <div>
        <div className="overflow-hidden rounded-card border border-base-border">
          <div className="bg-base-elevated px-4 py-2 text-sm font-semibold text-text-primary">
            스킬 우선순위
          </div>
          <div className="flex items-center justify-end gap-5 border-b border-base-border bg-base-surface px-4 py-1.5 text-xs text-text-faint">
            <span className="w-12 text-right">게임</span>
            <span className="w-12 text-right">픽률</span>
            <span className="w-12 text-right">승률</span>
          </div>
          <div className="divide-y divide-base-border bg-base-surface">
            {skillOrderStats.map((stat, i) => (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                  selectedIndex === i ? "bg-base-elevated" : "hover:bg-base-elevated"
                }`}
              >
                <span className="flex-1 truncate font-mono text-sm text-text-primary">
                  {(stat.item_ids as string[]).join(" > ")}
                </span>
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
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1.5 px-1 text-xs text-text-faint">
          스킬 빌드 순서 (레벨별){selectedIndex !== null ? " — 선택한 우선순위 기준" : " — 전체 기준"}
        </p>
        <SkillBuildGrid fullSkillOrder={activeOrder} />
      </div>
    </div>
  );
}
