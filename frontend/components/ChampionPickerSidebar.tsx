"use client";

import { useMemo, useState } from "react";
import { ChampionSummary } from "@/lib/api";

export function ChampionPickerSidebar({ champions }: { champions: ChampionSummary[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return champions;
    return champions.filter((c) => c.champion_name.includes(trimmed));
  }, [champions, query]);

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="챔피언 검색 (가렌, ㄱㄹ, ...)"
        className="mb-3 h-10 w-full rounded-md border border-base-border bg-base-elevated px-3 text-sm text-text-primary placeholder:text-text-faint focus:outline-none"
      />
      <div className="grid max-h-[70vh] grid-cols-4 gap-2 overflow-y-auto pr-1">
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
