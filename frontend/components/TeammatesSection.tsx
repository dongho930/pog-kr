import { Match } from "@/lib/api";
import { SummonerNameLink } from "./SummonerNameLink";

interface TeammateRow {
  puuid: string;
  gameName: string;
  tagLine: string;
  games: number;
  wins: number;
  losses: number;
}

/**
 * 소환사 카드 아래에 표시하는 "최근 N게임에서 같이 플레이한 소환사" 목록.
 * 매치 히스토리(이미 불러온 matches)만으로 프론트에서 집계한다 — 같은
 * 팀(team_id 동일)이었던 경우만 집계하고, 같이 플레이한 게임 수 내림차순으로
 * 정렬한다.
 */
export function TeammatesSection({ matches, puuid }: { matches: Match[]; puuid: string }) {
  const byPuuid = new Map<string, TeammateRow>();

  for (const m of matches) {
    const me = m.participants.find((p) => p.puuid === puuid);
    if (!me) continue;

    for (const other of m.participants) {
      if (other.puuid === puuid) continue;
      if (other.team_id !== me.team_id) continue; // 같은 팀이었던 경우만 집계

      const cur =
        byPuuid.get(other.puuid) ??
        ({
          puuid: other.puuid,
          gameName: other.game_name,
          tagLine: other.tag_line,
          games: 0,
          wins: 0,
          losses: 0,
        } satisfies TeammateRow);

      cur.games += 1;
      if (me.win) cur.wins += 1;
      else cur.losses += 1;
      // 가장 최근 매치의 닉네임을 우선하되, 비어 있으면 기존 값 유지
      cur.gameName = other.game_name || cur.gameName;
      cur.tagLine = other.tag_line || cur.tagLine;

      byPuuid.set(other.puuid, cur);
    }
  }

  const teammates = [...byPuuid.values()].sort((a, b) => b.games - a.games).slice(0, 10);

  if (teammates.length === 0) return null;

  return (
    <div className="mt-4 rounded-card border border-base-border bg-base-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-text-muted">
        최근 {matches.length}게임에서 같이 플레이한 소환사
      </h2>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 px-1 pb-1.5 text-xs text-text-faint">
        <span>소환사</span>
        <span className="text-right">승</span>
        <span className="text-right">패</span>
        <span className="text-right">승률</span>
      </div>
      <div className="space-y-1.5">
        {teammates.map((t) => {
          const winRate = Math.round((t.wins / t.games) * 100);
          const resultClass = winRate >= 50 ? "text-accent-win" : "text-accent-loss";
          return (
            <div
              key={t.puuid}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2 rounded-md bg-base-elevated px-2 py-1.5 text-sm"
            >
              <SummonerNameLink
                puuid={t.puuid}
                gameName={t.gameName}
                tagLine={t.tagLine}
                className="truncate text-text-primary hover:underline"
              >
                {t.gameName || "(알 수 없음)"}
                {t.tagLine && <span className="text-text-faint">#{t.tagLine}</span>}
              </SummonerNameLink>
              <span className="text-right font-mono text-accent-win">{t.wins}</span>
              <span className="text-right font-mono text-accent-loss">{t.losses}</span>
              <span className={`text-right font-mono font-semibold ${resultClass}`}>{winRate}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
