"use client";

import { useEffect, useState } from "react";
import { api, LeaderboardEntry } from "@/lib/api";

const TIERS = [
  { key: "challenger", label: "챌린저" },
  { key: "grandmaster", label: "그랜드마스터" },
  { key: "master", label: "마스터" },
];

const QUEUES = [
  { key: "RANKED_SOLO_5x5", label: "솔로랭크" },
  { key: "RANKED_FLEX_SR", label: "자유랭크" },
];

export function LeaderboardSection({ initialEntries }: { initialEntries: LeaderboardEntry[] }) {
  const [tier, setTier] = useState("challenger");
  const [queue, setQueue] = useState("RANKED_SOLO_5x5");
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tier === "challenger" && queue === "RANKED_SOLO_5x5") {
      setEntries(initialEntries);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getLeaderboard(tier, queue)
      .then((data) => {
        if (!cancelled) setEntries(data);
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
  }, [tier, queue, initialEntries]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {TIERS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTier(t.key)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                tier === t.key
                  ? "bg-accent-gold text-[#171207]"
                  : "bg-base-surface text-text-muted hover:text-text-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {QUEUES.map((q) => (
            <button
              key={q.key}
              onClick={() => setQueue(q.key)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                queue === q.key
                  ? "bg-base-elevated text-text-primary"
                  : "bg-base-surface text-text-muted hover:text-text-primary"
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">
          불러오는 중... (이름을 하나씩 조회하느라 조금 걸릴 수 있어요)
        </p>
      ) : error ? (
        <p className="text-sm text-accent-loss">{error}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-text-muted">데이터가 없습니다.</p>
      ) : (
        <table className="w-full border-separate border-spacing-y-1.5">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-faint">
              <th className="px-3 pb-2">순위</th>
              <th className="px-3 pb-2">소환사</th>
              <th className="px-3 pb-2 font-mono">LP</th>
              <th className="px-3 pb-2 font-mono">승률</th>
              <th className="px-3 pb-2 font-mono">전적</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.puuid || e.rank} className="bg-base-surface">
                <td className="rounded-l-card px-3 py-2.5 font-display font-bold text-accent-gold">
                  {e.rank}
                </td>
                <td className="px-3 py-2.5">
                  {e.tag_line ? (
                    <a
                      href={`/summoners/kr/${encodeURIComponent(e.game_name)}-${encodeURIComponent(e.tag_line)}`}
                      className="text-text-primary hover:text-accent-gold"
                    >
                      {e.game_name}
                      <span className="text-text-faint">#{e.tag_line}</span>
                    </a>
                  ) : (
                    <span className="text-text-faint">{e.game_name}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-text-primary">{e.lp.toLocaleString()}</td>
                <td className="px-3 py-2.5 font-mono text-text-muted">{e.win_rate.toFixed(1)}%</td>
                <td className="rounded-r-card px-3 py-2.5 font-mono text-text-faint">
                  {e.wins}승 {e.losses}패
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
