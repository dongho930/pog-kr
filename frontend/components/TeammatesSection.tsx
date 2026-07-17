import { api, Match } from "@/lib/api";
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
export async function TeammatesSection({ matches, puuid }: { matches: Match[]; puuid: string }) {
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

  // 매치 기록에 태그가 비어 있는 팀원은(오래된 Riot API 응답 등) puuid로
  // 현재 Riot ID를 역조회해서 채운다. 실패하면(탈퇴 계정 등) 원래 값 그대로 둔다.
  await Promise.all(
    teammates
      .filter((t) => !(t.gameName && t.tagLine))
      .map(async (t) => {
        try {
          const resolved = await api.resolveRiotIdByPuuid(t.puuid);
          t.gameName = resolved.game_name;
          t.tagLine = resolved.tag_line;
        } catch {
          // 역조회 실패 시 그대로 둔다 (SummonerNameLink가 클릭 시 재시도함).
        }
      })
  );

  return (
    <div className="mt-4 rounded-card border border-base-border bg-base-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-text-muted">
        최근 {matches.length}게임에서 같이 플레이한 소환사
      </h2>
      <table className="w-full table-fixed border-separate border-spacing-y-1.5 text-xs">
        <colgroup>
          <col className="w-[52%]" />
          <col className="w-[16%]" />
          <col className="w-[16%]" />
          <col className="w-[16%]" />
        </colgroup>
        <thead>
          <tr className="text-left text-[11px] text-text-faint">
            <th className="px-2 pb-1 font-normal">소환사</th>
            <th className="px-2 pb-1 text-right font-normal">승</th>
            <th className="px-2 pb-1 text-right font-normal">패</th>
            <th className="px-2 pb-1 text-right font-normal">승률</th>
          </tr>
        </thead>
        <tbody>
          {teammates.map((t) => {
            const winRate = Math.round((t.wins / t.games) * 100);
            const resultClass = winRate >= 50 ? "text-accent-win" : "text-accent-loss";
            return (
              <tr key={t.puuid} className="bg-base-elevated">
                <td className="overflow-hidden rounded-l-md px-2 py-1.5">
                  <SummonerNameLink
                    puuid={t.puuid}
                    gameName={t.gameName}
                    tagLine={t.tagLine}
                    className="block truncate text-text-muted hover:underline"
                  >
                    {t.gameName || "(알 수 없음)"}
                    {t.tagLine && <span>#{t.tagLine}</span>}
                  </SummonerNameLink>
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-text-muted">{t.wins}</td>
                <td className="px-2 py-1.5 text-right font-mono text-text-muted">{t.losses}</td>
                <td
                  className={`overflow-hidden rounded-r-md py-1.5 pl-2 pr-3 text-right font-mono font-semibold ${resultClass}`}
                >
                  {winRate}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
