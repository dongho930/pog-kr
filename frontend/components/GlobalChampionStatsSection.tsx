"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ChampionStat } from "@/lib/api";
import { SubModeTabs } from "./SubModeTabs";
import { GlobalChampionTierTable } from "./GlobalChampionTierTable";

const RANK_FILTERS = [
  { key: "ALL_RANK", label: "전체 랭크", queueIds: [420, 440] },
  { key: "SOLO", label: "솔로 랭크", queueIds: [420] },
  { key: "FLEX", label: "자유 랭크", queueIds: [440] },
];

const CURRENT_PATCH = "14.20";

export function GlobalChampionStatsSection({ initialStats }: { initialStats: ChampionStat[] }) {
  const [rankKey, setRankKey] = useState("ALL_RANK");
  const [stats, setStats] = useState<ChampionStat[]>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const filter = RANK_FILTERS.find((f) => f.key === rankKey) ?? RANK_FILTERS[0];
    if (rankKey === "ALL_RANK") {
      // 초기 로딩과 동일한 필터라 서버에서 이미 받아온 값을 재사용
      setStats(initialStats);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getTierList(CURRENT_PATCH, undefined, filter.queueIds)
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
  }, [rankKey, initialStats]);

  const filteredStats = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return stats;
    return stats.filter((s) => s.champion_name.toLowerCase().includes(trimmed));
  }, [stats, query]);

  return (
    <div>
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
