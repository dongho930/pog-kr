"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ChampionStat } from "@/lib/api";
import { SubModeTabs } from "./SubModeTabs";
import { GlobalChampionTierTable } from "./GlobalChampionTierTable";
import { POSITION_ICON } from "@/lib/positionIcons";

const RANK_FILTERS = [
  { key: "ALL_RANK", label: "전체 랭크", queueIds: [420, 440] },
  { key: "SOLO", label: "솔로 랭크", queueIds: [420] },
  { key: "FLEX", label: "자유 랭크", queueIds: [440] },
];

const POSITION_FILTERS = [
  { key: "ALL", label: "전체", position: undefined as string | undefined },
  { key: "TOP", label: "탑", position: "TOP" },
  { key: "JUNGLE", label: "정글", position: "JUNGLE" },
  { key: "MIDDLE", label: "미드", position: "MIDDLE" },
  { key: "BOTTOM", label: "바텀", position: "BOTTOM" },
  { key: "UTILITY", label: "서포터", position: "UTILITY" },
];

const CURRENT_PATCH = "14.20";

export function GlobalChampionStatsSection({ initialStats }: { initialStats: ChampionStat[] }) {
  const [rankKey, setRankKey] = useState("ALL_RANK");
  const [positionKey, setPositionKey] = useState("ALL");
  const [stats, setStats] = useState<ChampionStat[]>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (rankKey === "ALL_RANK" && positionKey === "ALL") {
      // 초기 로딩과 동일한 필터라 서버에서 이미 받아온 값을 재사용
      setStats(initialStats);
      setError(null);
      return;
    }
    const rank = RANK_FILTERS.find((f) => f.key === rankKey) ?? RANK_FILTERS[0];
    const position = POSITION_FILTERS.find((f) => f.key === positionKey)?.position;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getTierList(CURRENT_PATCH, position, rank.queueIds)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "조회에 실패했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rankKey, positionKey, initialStats]);

  const filteredStats = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return stats;
    return stats.filter((s) => s.champion_name.toLowerCase().includes(trimmed));
  }, [stats, query]);

  return (
    <div>
      <div className="mb-3 flex gap-1">
        {POSITION_FILTERS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPositionKey(p.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
              positionKey === p.key
                ? "bg-accent-gold text-[#171207]"
                : "bg-base-surface text-text-muted hover:text-text-primary"
            }`}
          >
            {p.position && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={POSITION_ICON[p.position]}
                alt=""
                className={`h-4 w-4 ${positionKey === p.key ? "" : "opacity-70"}`}
              />
            )}
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <SubModeTabs
          subModes={RANK_FILTERS.map(({ key, label }) => ({ key, label, queueIds: null }))}
          active={rankKey}
          onChange={setRankKey}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="챔피언 이름 검색"
          className="h-9 w-48 rounded-md border border-base-border bg-base-surface px-3 text-sm text-text-primary placeholder:text-text-faint focus:outline-none"
        />
      </div>
      {loading ? (
        <p className="text-sm text-text-muted">불러오는 중...</p>
      ) : error ? (
        <p className="text-sm text-accent-loss">{error}</p>
      ) : stats.length === 0 ? (
        <p className="text-sm text-text-muted">
          아직 집계된 통계가 없습니다. 소환사를 몇 명 검색해서 매치 데이터를 쌓아보세요.
        </p>
      ) : filteredStats.length === 0 ? (
        <p className="text-sm text-text-muted">&quot;{query}&quot;에 해당하는 챔피언이 없습니다.</p>
      ) : (
        <GlobalChampionTierTable stats={filteredStats} />
      )}
    </div>
  );
}
