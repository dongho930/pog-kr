"use client";

import { useEffect, useState } from "react";
import { api, ChampionBuildStat, ChampionRunePageDetail } from "@/lib/api";
import { RunePageDetailView } from "./RunePageDetailView";

function RunePageSummaryCard({
  stat,
  active,
  selected,
  onClick,
}: {
  stat: ChampionBuildStat;
  active: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md border px-4 py-3 text-left transition ${
        selected
          ? "border-accent-gold bg-base-elevated ring-1 ring-accent-gold"
          : active
            ? "border-accent-gold/50 bg-base-elevated"
            : "border-base-border bg-base-surface hover:bg-base-elevated"
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
        <p className="font-mono text-xs font-bold text-text-primary">{stat.games.toLocaleString()} 게임</p>
      </div>
      <p className="ml-2 font-mono text-base font-bold text-accent-win">
        {stat.win_rate.toFixed(2)}%
      </p>
    </button>
  );
}

export function RunePageGrid({
  championId,
  runePageStats,
  position,
  queueIds,
  tier,
}: {
  championId: number;
  runePageStats: ChampionBuildStat[];
  keystoneStats: ChampionBuildStat[];
  primarySlot1Stats: ChampionBuildStat[];
  primarySlot2Stats: ChampionBuildStat[];
  primarySlot3Stats: ChampionBuildStat[];
  secondaryRuneStats: ChampionBuildStat[];
  position?: string;
  queueIds?: number[];
  tier?: string;
}) {
  // 픽률이 가장 높은 조합(=첫 번째)이 항상 맨 왼쪽에 오도록 이미 games 내림차순으로
  // 정렬되어 온다 (pick_rate = games / total_games 라 순서가 동일함).
  const topStats = runePageStats.slice(0, 2);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detail, setDetail] = useState<ChampionRunePageDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadDetail(index: number) {
    const stat = topStats[index];
    if (!stat) return;
    const [primaryStyle, subStyle] = stat.item_ids as number[];
    setLoading(true);
    setError(null);
    api
      .getChampionRunePageDetail(championId, primaryStyle, subStyle, { position, queueIds, tier })
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : "조회에 실패했습니다."))
      .finally(() => setLoading(false));
  }

  // 페이지 진입 시(또는 필터가 바뀌어 목록이 바뀔 때) 자동으로 1순위 조합을 보여준다 —
  // 별도의 "집계 요약" 화면 없이 바로 실제 클라이언트 스타일 상세 화면이 뜨도록.
  useEffect(() => {
    setSelectedIndex(0);
    loadDetail(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [championId, runePageStats, position, queueIds, tier]);

  function handleSelect(index: number) {
    if (selectedIndex === index) return;
    setSelectedIndex(index);
    loadDetail(index);
  }

  return (
    <div>
      {/* 룬 페이지 조합 요약 (픽률 높은 순 — 클릭하면 그 조합의 상세 룬 페이지로 전환) */}
      <div className="mb-4 flex flex-wrap gap-3">
        {topStats.map((stat, i) => (
          <RunePageSummaryCard
            key={i}
            stat={stat}
            active={i === 0}
            selected={selectedIndex === i}
            onClick={() => handleSelect(i)}
          />
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">불러오는 중...</p>
      ) : error ? (
        <p className="text-sm text-accent-loss">{error}</p>
      ) : detail ? (
        <RunePageDetailView detail={detail} />
      ) : null}
    </div>
  );
}
