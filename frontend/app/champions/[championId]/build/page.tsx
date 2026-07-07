import { api } from "@/lib/api";
import { ChampionBuildSection } from "@/components/ChampionBuildSection";

export default async function ChampionBuildPage({
  params,
}: {
  params: { championId: string };
}) {
  const championId = Number(params.championId);

  let build: Awaited<ReturnType<typeof api.getChampionBuild>> | null = null;
  let error: string | null = null;
  try {
    build = await api.getChampionBuild(championId);
  } catch (e) {
    error = e instanceof Error ? e.message : "빌드 정보를 불러오지 못했습니다.";
  }

  if (error || !build) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-accent-loss/40 bg-base-surface p-6 text-center">
        <p className="text-base font-semibold text-accent-loss">아직 데이터가 없어요</p>
        <p className="mt-2 text-sm text-text-muted">
          {error ?? "이 챔피언에 대한 매치 데이터가 아직 pog.kr에 쌓이지 않았습니다."}
        </p>
        <a href="/tier-list" className="mt-4 inline-block text-sm text-accent-gold hover:underline">
          챔피언 티어로 돌아가기
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={build.champion_icon_url}
          alt={build.champion_name}
          className="h-16 w-16 rounded-md bg-base-elevated object-cover"
        />
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">{build.champion_name}</h1>
          <p className="text-sm text-text-faint">
            pog.kr 수집 매치 {build.games}경기 기준 · 전체 승률 {build.win_rate.toFixed(1)}%
          </p>
        </div>
      </div>

      <ChampionBuildSection championId={championId} initialBuild={build} />

      <p className="mt-6 text-xs text-text-faint">
        * pog.kr에서 검색된 소환사들의 매치를 집계한 통계입니다. 아이템 구매 "순서(빌드 경로)"와
        시작 아이템은 이번 버전에는 포함되지 않았어요 — 각 아이템/룬 개별 통계만 제공합니다.
      </p>
    </div>
  );
}
