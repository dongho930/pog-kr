import { api } from "@/lib/api";
import { LeaderboardSection } from "@/components/LeaderboardSection";

export default async function LeaderboardPage() {
  const initialEntries = await api.getLeaderboard("challenger", "RANKED_SOLO_5x5").catch(() => []);

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-text-primary">랭킹</h1>
      <p className="mb-6 text-sm text-text-faint">
        Riot League-V4 API 기준 챌린저 · 그랜드마스터 · 마스터 리더보드
      </p>
      <LeaderboardSection initialEntries={initialEntries} />
    </div>
  );
}
