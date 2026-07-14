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
        <div className="mb-1.5 flex justify-between px-3 text-xs text-text-faint">
          <span>스킬 우선순위</span>
          <span className="flex gap-3">
            <span>게임</span>
            <span>픽률</span>
            <span>승률</span>
          </span>
        </div>
        <div className="space-y-1">
          {skillOrderStats.map((stat, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition ${
                selectedIndex === i
                  ? "border-accent-gold bg-base-elevated"
                  : "border-base-border bg-base-surface hover:bg-base-elevated"
              }`}
            >
              <span className="font-mono text-sm text-text-primary">
                {(stat.item_ids as string[]).join(" > ")}
              </span>
              <span className="flex gap-3 font-mono text-xs">
                <span className="text-text-faint">{stat.games.toLocaleString()}</span>
                <span className="text-text-muted">{stat.pick_rate.toFixed(1)}%</span>
                <span className={stat.win_rate >= 50 ? "text-accent-win" : "text-accent-loss"}>
                  {stat.win_rate.toFixed(1)}%
                </span>
              </span>
            </button>
          ))}
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
