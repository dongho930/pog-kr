"use client";

import { useMemo, useState } from "react";
import { ChampionSummary } from "@/lib/api";

const POSITION_TABS = [
  { key: "ALL", label: "전체", position: null as string | null },
  { key: "TOP", label: "탑", position: "TOP" },
  { key: "JUNGLE", label: "정글", position: "JUNGLE" },
  { key: "MIDDLE", label: "미드", position: "MIDDLE" },
  { key: "BOTTOM", label: "바텀", position: "BOTTOM" },
  { key: "UTILITY", label: "서포터", position: "UTILITY" },
];

export function ChampionPickerSidebar({ champions }: { champions: ChampionSummary[] }) {
  const [query, setQuery] = useState("");
  const [positionKey, setPositionKey] = useState("ALL");

  const filtered = useMemo(() => {
    const position = POSITION_TABS.find((p) => p.key === positionKey)?.position ?? null;
    const trimmed = query.trim();
    return champions.filter((c) => {
      if (position && !c.positions.includes(position)) return false;
      if (trimmed && !c.champion_name.includes(trimmed)) return false;
      return true;
    });
  }, [champions, query, positionKey]);

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="챔피언 검색 (가렌, ㄱㄹ, ...)"
        className="mb-3 h-10 w-full rounded-md border border-base-border bg-base-elevated px-3 text-sm text-text-primary placeholder:text-text-faint focus:outline-none"
      />

      <div className="mb-3 flex flex-wrap gap-1">
        {POSITION_TABS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPositionKey(p.key)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              positionKey === p.key
                ? "bg-accent-gold text-[#171207]"
                : "bg-base-elevated text-text-faint hover:text-text-primary"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {positionKey !== "ALL" && (
        <p className="mb-3 text-[11px] text-text-faint">
          ※ pog.kr에 수집된 매치 기록 기준이라, 해당 포지션 기록이 아직 없는 챔피언은 안 보일 수
          있어요.
        </p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {filtered.map((c) => (
          <a
            key={c.champion_id}
            href={`/champions/${c.champion_id}/build`}
            className="group flex flex-col items-center gap-1 rounded-md p-1.5 text-center hover:bg-base-elevated"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.champion_icon_url}
              alt={c.champion_name}
              className="h-12 w-12 rounded-md bg-base-elevated object-cover"
            />
            <span className="w-full truncate text-xs text-text-muted group-hover:text-text-primary">
              {c.champion_name}
            </span>
          </a>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-4 py-6 text-center text-sm text-text-muted">
            검색 결과가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
