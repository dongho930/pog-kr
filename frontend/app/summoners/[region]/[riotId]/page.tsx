import { api } from "@/lib/api";
import { SummonerCard } from "@/components/SummonerCard";
import { RecentSummaryBar } from "@/components/RecentSummaryBar";
import { TeammatesSection } from "@/components/TeammatesSection";
import { MatchHistorySection } from "@/components/MatchHistorySection";
import { LiveGameBanner } from "@/components/LiveGameBanner";
import { ChampionStatsSection } from "@/components/ChampionStatsSection";
import { TabNav } from "@/components/TabNav";

export default async function SummonerProfilePage({
  params,
}: {
  params: { region: string; riotId: string };
}) {
  const [gameName, tagLine] = params.riotId.split("-");

  let summoner: Awaited<ReturnType<typeof api.getSummoner>>;
  try {
    summoner = await api.getSummoner(params.region, gameName, tagLine);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "소환사 정보를 불러오는 중 오류가 발생했습니다.";
    return (
      <div className="mx-auto max-w-lg rounded-card border border-accent-loss/40 bg-base-surface p-6 text-center">
        <p className="text-base font-semibold text-accent-loss">소환사를 찾을 수 없어요</p>
        <p className="mt-2 text-sm text-text-muted">{message}</p>
        <p className="mt-4 text-xs text-text-faint">
          "게임명#태그" 형식으로 정확히 입력했는지, 띄어쓰기가 실제 공백인지(예: %20 같은 텍스트가
          아닌지) 확인해보세요.
        </p>
        <a href="/" className="mt-4 inline-block text-sm text-accent-gold hover:underline">
          다시 검색하기
        </a>
      </div>
    );
  }

  let matches: Awaited<ReturnType<typeof api.getMatchHistory>> = [];
  let matchesError: string | null = null;
  try {
    matches = await api.getMatchHistory(summoner.puuid);
  } catch (e) {
    matchesError = e instanceof Error ? e.message : "매치 히스토리를 불러오지 못했습니다.";
  }

  const [liveGame, championStats] = await Promise.all([
    api.getLiveGame(summoner.puuid).catch(() => ({ in_game: false, participants: [] })),
    api.getChampionStatsBySummoner(summoner.puuid).catch(() => []),
  ]);

  const recentForm = matches
    .slice(0, 10)
    .reverse()
    .map((m) => m.participants.find((p) => p.puuid === summoner.puuid)?.win ?? false);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
      <aside>
        <SummonerCard summoner={summoner} recentForm={recentForm} />
        <TeammatesSection matches={matches} puuid={summoner.puuid} />
      </aside>

      <section className="min-w-0">
        <RecentSummaryBar matches={matches} puuid={summoner.puuid} />
        <TabNav
          matchesContent={
            matchesError ? (
              <div className="rounded-card border border-accent-loss/40 bg-base-surface p-4">
                <p className="text-sm font-semibold text-accent-loss">매치 히스토리를 불러오지 못했어요</p>
                <p className="mt-1 text-sm text-text-muted">{matchesError}</p>
              </div>
            ) : (
              <MatchHistorySection matches={matches} puuid={summoner.puuid} />
            )
          }
          liveContent={<LiveGameBanner game={liveGame} />}
          championsContent={
            <ChampionStatsSection
              puuid={summoner.puuid}
              matches={matches}
              initialStats={championStats}
            />
          }
        />
      </section>
    </div>
  );
}
