import { Match, MatchParticipant } from "@/lib/api";

/**
 * 소환사 프로필 상단에 표시하는 "최근 N전 요약" 카드.
 * 최근 매치 히스토리(기본 20경기)를 그대로 집계해서 보여준다 — 별도
 * 백엔드 계산 없이 이미 불러온 matches 배열만으로 렌더링한다.
 */
export function RecentSummaryBar({ matches, puuid }: { matches: Match[]; puuid: string }) {
  const rows = matches
    .map((m) => m.participants.find((p) => p.puuid === puuid))
    .filter((p): p is MatchParticipant => !!p);

  if (rows.length === 0) return null;

  const games = rows.length;
  const wins = rows.filter((p) => p.win).length;
  const losses = games - wins;
  const winRate = Math.round((wins / games) * 100);

  const avgKills = rows.reduce((sum, p) => sum + p.kills, 0) / games;
  const avgDeaths = rows.reduce((sum, p) => sum + p.deaths, 0) / games;
  const avgAssists = rows.reduce((sum, p) => sum + p.assists, 0) / games;
  const avgKda = avgDeaths === 0 ? avgKills + avgAssists : (avgKills + avgAssists) / avgDeaths;

  // 모스트 챔피언 (게임 수 내림차순 상위 3개)
  const byChampion = new Map<
    number,
    { icon: string; games: number; wins: number; losses: number; kills: number; deaths: number; assists: number }
  >();
  for (const p of rows) {
    const cur = byChampion.get(p.champion_id) ?? {
      icon: p.champion_icon_url,
      games: 0,
      wins: 0,
      losses: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
    };
    cur.games += 1;
    if (p.win) cur.wins += 1;
    else cur.losses += 1;
    cur.kills += p.kills;
    cur.deaths += p.deaths;
    cur.assists += p.assists;
    byChampion.set(p.champion_id, cur);
  }
  const topChampions = [...byChampion.values()].sort((a, b) => b.games - a.games).slice(0, 3);

  const r = 20;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - winRate / 100);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-6 rounded-card border border-base-border bg-base-surface px-5 py-3.5">
      <p className="font-mono text-sm font-bold text-sky-400">
        {games}전 {wins}승 {losses}패
      </p>

      <div className="flex items-center gap-3">
        <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
          <g transform="rotate(-90 26 26)">
            <circle cx="26" cy="26" r={r} fill="none" stroke="#232A38" strokeWidth="5" />
            <circle
              cx="26"
              cy="26"
              r={r}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </g>
          <text x="26" y="26" textAnchor="middle" dominantBaseline="central" fill="#38bdf8" fontSize="13" fontWeight="700">
            {winRate}%
          </text>
        </svg>
        <div>
          <p className="font-mono text-sm font-semibold text-text-primary">{avgKda.toFixed(2)} KDA</p>
          <p className="font-mono text-xs text-text-muted">
            {avgKills.toFixed(1)} / {avgDeaths.toFixed(1)} / {avgAssists.toFixed(1)}
          </p>
        </div>
      </div>

      <div className="h-10 w-px bg-base-border" />

      <div>
        <p className="mb-1.5 text-xs text-text-faint">모스트 {topChampions.length}챔피언</p>
        <div className="flex items-center gap-4">
          {topChampions.map((c, i) => {
            const pickRate = Math.round((c.games / games) * 100);
            const kda = c.deaths === 0 ? c.kills + c.assists : (c.kills + c.assists) / c.deaths;
            return (
              <div key={i} className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.icon} alt="" className="h-9 w-9 rounded-md bg-base-elevated object-cover" />
                <div>
                  <p className="font-mono text-xs font-semibold text-accent-gold">{pickRate}%</p>
                  <p className="text-[11px] text-text-muted">
                    {c.wins}승 {c.losses}패
                  </p>
                  <p className="font-mono text-[11px] text-text-faint">{kda.toFixed(2)} KDA</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
