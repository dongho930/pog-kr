"use client";

import { useEffect, useState } from "react";
import { api, ChampionStat, Match } from "@/lib/api";
import { GAME_MODES, GameModeKey, getEffectiveQueueIds, getGameMode } from "@/lib/gameModes";
import { GameModeTabs } from "./GameModeTabs";
import { SubModeTabs } from "./SubModeTabs";
import { ChampionTierTable } from "./ChampionTierTable";

export function ChampionStatsSection({
  puuid,
  initialStats,
}: {
  puuid: string;
  matches: Match[];
  initialStats: ChampionStat[];
}) {
  const [mode, setMode] = useState<GameModeKey>("ALL");
  const [subMode, setSubMode] = useState<string>("ALL");
  const [stats, setStats] = useState<ChampionStat[]>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMode = getGameMode(mode);

  function handleModeChange(next: GameModeKey) {
    setMode(next);
    setSubMode("ALL");
  }

  useEffect(() => {
    const queueIds = getEffectiveQueueIds(mode, subMode);

    if (mode === "ALL") {
      setStats(initialStats);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getChampionStatsBySummoner(puuid, queueIds ?? undefined)
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
  }, [mode, subMode, puuid, initialStats]);

  return (
    <div>
      <GameModeTabs modes={GAME_MODES} active={mode} onChange={handleModeChange} />
      {currentMode.subModes && (
        <SubModeTabs subModes={currentMode.subModes} active={subMode} onChange={setSubMode} />
      )}
      {loading ? (
        <p className="text-sm text-text-muted">불러오는 중...</p>
      ) : error ? (
        <p className="text-sm text-accent-loss">{error}</p>
      ) : stats.length === 0 ? (
        <p className="text-sm text-text-muted">전적 기록이 없습니다.</p>
      ) : (
        <ChampionTierTable stats={stats} />
      )}
    </div>
  );
}
