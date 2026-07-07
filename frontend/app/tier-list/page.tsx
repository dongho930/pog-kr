import { api } from "@/lib/api";
import { GlobalChampionStatsSection } from "@/components/GlobalChampionStatsSection";
import { ChampionPickerSidebar } from "@/components/ChampionPickerSidebar";

const CURRENT_PATCH = "14.20";

export default async function TierListPage() {
  // 기본값: 솔로+자유 랭크만 집계 (일반/칼바람 등은 제외 — "랭크 챔피언 분석" 목적에 맞춤)
  const [stats, champions] = await Promise.all([
    api.getTierList(CURRENT_PATCH, undefined, [420, 440]).catch(() => []),
    api.getAllChampions().catch(() => []),
  ]);

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-text-primary">챔피언 티어</h1>
      <p className="mb-6 text-sm text-text-faint">
        pog.kr에서 검색된 소환사들의 매치를 모아 집계한 값이에요 (패치 {CURRENT_PATCH} 기준 정적
        데이터가 없으면 실시간 집계로 대체)
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <ChampionPickerSidebar champions={champions} />
        <GlobalChampionStatsSection initialStats={stats} />
      </div>
    </div>
  );
}
