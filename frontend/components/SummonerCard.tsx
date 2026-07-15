import { Summoner } from "@/lib/api";
import { FormStreak } from "./FormStreak";
import { tierEmblemUrl } from "@/lib/rankIcons";

function RankBlock({
  label,
  tier,
  rank,
  lp,
  wins,
  losses,
}: {
  label: string;
  tier: string | null;
  rank: string | null;
  lp: number;
  wins: number;
  losses: number;
}) {
  const total = wins + losses;
  const winRate = total ? Math.round((wins / total) * 1000) / 10 : 0;
  const emblemUrl = tierEmblemUrl(tier);

  return (
    <div className="rounded-md bg-base-elevated px-4 py-2">
      <div className="flex flex-col items-center text-center">
        <p className="text-sm font-bold text-text-primary">{label}</p>
        {emblemUrl && (
          <div className="h-32 w-32 shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={emblemUrl} alt="" className="h-full w-full scale-[3.1] object-contain" />
          </div>
        )}
        <p className="font-display font-semibold text-accent-gold">
          {tier ? `${tier} ${rank ?? ""}` : "Unranked"}
        </p>
        {tier && <p className="mt-0.5 font-mono text-sm text-text-primary">{lp} LP</p>}
      </div>
      {total > 0 && (
        <div className="mt-3 flex items-center justify-center border-t border-base-border pt-2 font-mono text-xs text-text-muted">
          {winRate}% ({total}전)
        </div>
      )}
    </div>
  );
}

export function SummonerCard({
  summoner,
  recentForm,
}: {
  summoner: Summoner;
  recentForm: boolean[];
}) {
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

      <div className="mt-5 space-y-3">
        <RankBlock
          label="솔로랭크"
          tier={summoner.solo_tier}
          rank={summoner.solo_rank}
          lp={summoner.solo_lp}
          wins={summoner.solo_wins}
          losses={summoner.solo_losses}
        />
        <RankBlock
          label="자유랭크"
          tier={summoner.flex_tier}
          rank={summoner.flex_rank}
          lp={summoner.flex_lp}
          wins={summoner.flex_wins}
          losses={summoner.flex_losses}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-text-faint">최근 전적</span>
        <FormStreak results={recentForm} />
      </div>
    </div>
  );
}
