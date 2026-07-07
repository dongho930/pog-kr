import { Summoner } from "@/lib/api";
import { FormStreak } from "./FormStreak";

export function SummonerCard({
  summoner,
  recentForm,
}: {
  summoner: Summoner;
  recentForm: boolean[];
}) {
  const total = summoner.solo_wins + summoner.solo_losses;
  const winRate = total ? Math.round((summoner.solo_wins / total) * 1000) / 10 : 0;

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-5">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={summoner.profile_icon_url}
          alt="소환사 아이콘"
          className="h-16 w-16 shrink-0 rounded-full border-2 border-accent-gold bg-base-elevated object-cover"
        />
        <div>
          <h1 className="font-display text-lg font-semibold text-text-primary">
            {summoner.game_name}
            <span className="text-text-faint"> #{summoner.tag_line}</span>
          </h1>
          <p className="text-sm text-text-muted">레벨 {summoner.summoner_level}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-md bg-base-elevated px-3 py-2.5">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-faint">솔로랭크</p>
          <p className="font-display font-semibold text-accent-gold">
            {summoner.solo_tier ?? "언랭크"} {summoner.solo_rank ?? ""}
          </p>
        </div>
        <div className="text-right font-mono">
          <p className="text-sm text-text-primary">{summoner.solo_lp} LP</p>
          <p className="text-xs text-text-muted">{winRate}% ({total}전)</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-text-faint">최근 폼</span>
        <FormStreak results={recentForm} />
      </div>
    </div>
  );
}
