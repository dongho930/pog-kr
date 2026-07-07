"use client";

import { useMemo, useState } from "react";
import { ChampionStat } from "@/lib/api";

const TIER_RANK: Record<string, number> = { S: 7, A: 6, B: 5, C: 4, D: 3, E: 2, F: 1, "?": 0 };

const TIER_COLOR: Record<string, string> = {
  S: "text-accent-gold",
  A: "text-accent-win",
  B: "text-blue-400",
  C: "text-text-primary",
  D: "text-text-muted",
  E: "text-text-faint",
  F: "text-accent-loss",
  "?": "text-text-faint",
};

const POSITION_LABEL: Record<string, string> = {
  TOP: "탑",
  JUNGLE: "정글",
  MIDDLE: "미드",
  BOTTOM: "원딜",
  UTILITY: "서포터",
  UNKNOWN: "전체",
};

type SortKey = "tier" | "name" | "winRate" | "pickRate" | "banRate" | "games";
type SortDirection = "asc" | "desc";

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onClick: (key: SortKey) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={`flex items-center gap-1 transition ${
        active ? "text-text-primary" : "text-text-faint hover:text-text-muted"
      }`}
    >
      {label}
      <span className="text-[9px]">{active ? (direction === "asc" ? "▲" : "▼") : "▽"}</span>
    </button>
  );
}

export function GlobalChampionTierTable({ stats }: { stats: ChampionStat[] }) {
  // 기본 정렬: 티어가 높은 순서
  const [sortKey, setSortKey] = useState<SortKey>("tier");
  const [direction, setDirection] = useState<SortDirection>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(key === "name" ? "asc" : "desc"); // 이름은 가나다 오름차순부터, 나머지는 높은 순부터
    }
  }

  const sorted = useMemo(() => {
    const copy = [...stats];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "tier":
          cmp = (TIER_RANK[a.tier] ?? -1) - (TIER_RANK[b.tier] ?? -1);
          break;
        case "name":
          cmp = a.champion_name.localeCompare(b.champion_name, "ko");
          break;
        case "winRate":
          cmp = a.win_rate - b.win_rate;
          break;
        case "pickRate":
          cmp = a.pick_rate - b.pick_rate;
          break;
        case "banRate":
          cmp = a.ban_rate - b.ban_rate;
          break;
        case "games":
          cmp = a.sample_size - b.sample_size;
          break;
      }
      return direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [stats, sortKey, direction]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-1.5">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
            <th className="px-3 pb-2">
              <SortableHeader
                label="챔피언"
                sortKey="name"
                activeKey={sortKey}
                direction={direction}
                onClick={handleSort}
              />
            </th>
            <th className="px-3 pb-2">포지션</th>
            <th className="px-3 pb-2">
              <SortableHeader
                label="티어"
                sortKey="tier"
                activeKey={sortKey}
                direction={direction}
                onClick={handleSort}
              />
            </th>
            <th className="px-3 pb-2 font-mono">
              <SortableHeader
                label="승률"
                sortKey="winRate"
                activeKey={sortKey}
                direction={direction}
                onClick={handleSort}
              />
            </th>
            <th className="px-3 pb-2 font-mono">
              <SortableHeader
                label="픽률"
                sortKey="pickRate"
                activeKey={sortKey}
                direction={direction}
                onClick={handleSort}
              />
            </th>
            <th className="px-3 pb-2 font-mono">
              <SortableHeader
                label="밴률"
                sortKey="banRate"
                activeKey={sortKey}
                direction={direction}
                onClick={handleSort}
              />
            </th>
            <th className="px-3 pb-2 font-mono">
              <SortableHeader
                label="게임 수"
                sortKey="games"
                activeKey={sortKey}
                direction={direction}
                onClick={handleSort}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={`${s.champion_id}-${s.position}`} className="bg-base-surface">
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
              <td className="px-3 py-2.5 text-text-muted">
                {POSITION_LABEL[s.position] ?? s.position}
              </td>
              <td
                className={`px-3 py-2.5 font-display font-bold ${TIER_COLOR[s.tier] ?? "text-text-primary"}`}
              >
                {s.tier}
              </td>
              <td className="px-3 py-2.5 font-mono text-text-primary">{s.win_rate.toFixed(1)}%</td>
              <td className="px-3 py-2.5 font-mono text-text-muted">{s.pick_rate.toFixed(1)}%</td>
              <td className="px-3 py-2.5 font-mono text-text-muted">{s.ban_rate.toFixed(1)}%</td>
              <td className="rounded-r-card px-3 py-2.5 font-mono text-text-faint">
                {s.sample_size.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
