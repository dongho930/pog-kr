"use client";

import { useEffect, useState } from "react";
import { api, ChampionBuild } from "@/lib/api";
import { StatSection, Icon } from "./ChampionBuildStatSection";
import { RunePageGrid } from "./RunePageGrid";
import { SkillBuildSection } from "./SkillBuildSection";

import { GAME_MODES } from "@/lib/gameModes";

const QUEUE_OPTIONS = [
  { key: "ALL", label: "전체", queueIds: undefined as number[] | undefined },
  { key: "SOLO", label: "개인/2인 랭크", queueIds: [420] },
  { key: "FLEX", label: "자유 랭크", queueIds: [440] },
  {
    key: "ARAM",
    label: "무작위 총력전",
    queueIds: GAME_MODES.find((m) => m.key === "ARAM")!.queueIds ?? undefined,
  },
  {
    key: "ARENA",
    label: "아레나",
    queueIds: GAME_MODES.find((m) => m.key === "ARENA")!.queueIds ?? undefined,
  },
];

const TIER_OPTIONS = [
  { key: "ALL", label: "전체 티어" },
  { key: "CHALLENGER", label: "챌린저" },
  { key: "GRANDMASTER", label: "그랜드마스터" },
  { key: "MASTER_PLUS", label: "마스터+" },
  { key: "MASTER", label: "마스터" },
  { key: "DIAMOND_PLUS", label: "다이아몬드+" },
  { key: "DIAMOND", label: "다이아몬드" },
  { key: "EMERALD_PLUS", label: "에메랄드+" },
  { key: "EMERALD", label: "에메랄드" },
  { key: "PLATINUM_PLUS", label: "플래티넘+" },
  { key: "PLATINUM", label: "플래티넘" },
  { key: "GOLD_PLUS", label: "골드+" },
  { key: "GOLD", label: "골드" },
  { key: "SILVER", label: "실버" },
  { key: "BRONZE", label: "브론즈" },
  { key: "IRON", label: "아이언" },
];

export function ChampionBuildSection({
  championId,
  initialBuild,
}: {
  championId: number;
  initialBuild: ChampionBuild;
}) {
  const [queueKey, setQueueKey] = useState("ALL");
  const [tierKey, setTierKey] = useState("ALL");
  const [tierOpen, setTierOpen] = useState(false);
  const [build, setBuild] = useState<ChampionBuild>(initialBuild);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (queueKey === "ALL" && tierKey === "ALL") {
      setBuild(initialBuild);
      setError(null);
      return;
    }
    const queue = QUEUE_OPTIONS.find((q) => q.key === queueKey);
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getChampionBuild(championId, {
        queueIds: queue?.queueIds,
        tier: tierKey === "ALL" ? undefined : tierKey,
      })
      .then((data) => {
        if (!cancelled) setBuild(data);
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
  }, [queueKey, tierKey, championId, initialBuild]);

  return (
    <div>
      {/* 큐 선택 */}
      <div className="mb-3 flex flex-wrap gap-1">
        {QUEUE_OPTIONS.map((q) => (
          <button
            key={q.key}
            onClick={() => setQueueKey(q.key)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              queueKey === q.key
                ? "bg-accent-gold text-[#171207]"
                : "bg-base-surface text-text-muted hover:text-text-primary"
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* 티어 선택 (드롭다운) */}
      <div className="relative mb-3 inline-block">
        <button
          onClick={() => setTierOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-base-border bg-base-surface px-3 py-1.5 text-sm font-semibold text-text-primary"
        >
          {TIER_OPTIONS.find((t) => t.key === tierKey)?.label}
          <span className={`text-text-faint transition-transform ${tierOpen ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>
        {tierOpen && (
          <div className="absolute z-10 mt-1 max-h-80 w-48 overflow-y-auto rounded-md border border-base-border bg-base-surface shadow-lg">
            {TIER_OPTIONS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTierKey(t.key);
                  setTierOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm transition ${
                  tierKey === t.key
                    ? "bg-base-elevated text-accent-gold"
                    : "text-text-muted hover:bg-base-elevated hover:text-text-primary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tierKey !== "ALL" && (
        <p className="mb-4 text-xs text-text-faint">
          ※ 티어 필터는 각 매치를 pog.kr이 처음 수집한 시점에 고정해둔 티어 기준이에요 (Riot
          API가 "그 경기 당시의 티어"를 따로 주지 않아서, 매번 바뀌는 현재 티어 대신 수집
          시점 값을 고정해서 씁니다). 검색된 적 없는 상대 참가자는 티어 정보가 없을 수 있어
          표본이 줄어들 수 있어요.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-text-muted">불러오는 중...</p>
      ) : error ? (
        <p className="text-sm text-accent-loss">{error}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-faint">
            이 조건의 매치 {build.games}경기 · 승률 {build.win_rate.toFixed(1)}%
          </p>

          <section>
            <h2 className="mb-1.5 text-sm font-semibold text-text-muted">룬</h2>
            <RunePageGrid
              championId={championId}
              runePageStats={build.rune_page_stats}
              keystoneStats={build.keystone_stats}
              primarySlot1Stats={build.primary_slot1_stats}
              primarySlot2Stats={build.primary_slot2_stats}
              primarySlot3Stats={build.primary_slot3_stats}
              secondaryRuneStats={build.secondary_rune_stats}
              queueIds={QUEUE_OPTIONS.find((q) => q.key === queueKey)?.queueIds}
              tier={tierKey === "ALL" ? undefined : tierKey}
            />
          </section>

          <div className="space-y-3">
            <StatSection
              title="소환사 주문"
              stats={build.spell_stats}
              renderIcons={(s) => (
                <>
                  {(s.icon_urls ?? []).map((url, i) => (
                    <Icon key={i} url={url} size="h-9 w-9" />
                  ))}
                </>
              )}
            />

            <section>
              <h2 className="mb-1.5 text-sm font-semibold text-text-muted">스킬 빌드</h2>
              <SkillBuildSection
                skillOrderStats={build.skill_order_stats}
                defaultFullOrder={build.full_skill_order}
              />
            </section>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatSection
              title="시작 아이템"
              stats={build.starting_item_stats}
              renderIcons={(s) => (
                <>
                  {(s.icon_urls ?? []).map((url, i) => (
                    <Icon key={i} url={url} size="h-9 w-9" />
                  ))}
                </>
              )}
            />
            <StatSection
              title="신발"
              stats={build.boots_stats}
              renderIcons={(s) => <Icon url={s.icon_url} size="h-9 w-9" />}
            />
            <StatSection
              title="장신구"
              stats={build.trinket_stats}
              renderIcons={(s) => <Icon url={s.icon_url} size="h-9 w-9" />}
            />
          </div>

          <StatSection
            title="핵심 아이템 (개별 픽률)"
            stats={build.core_item_stats}
            renderIcons={(s) => <Icon url={s.icon_url} size="h-9 w-9" />}
          />
        </div>
      )}
    </div>
  );
}
