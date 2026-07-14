"use client";

import { useEffect, useState } from "react";
import { api, Match, MatchParticipant, ParticipantRank, TeamObjectives } from "@/lib/api";
import { BuildTimeline } from "./BuildTimeline";
import { SummonerNameLink } from "./SummonerNameLink";

const POSITION_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

const TIER_KOREAN: Record<string, string> = {
  IRON: "아이언",
  BRONZE: "브론즈",
  SILVER: "실버",
  GOLD: "골드",
  PLATINUM: "플래티넘",
  EMERALD: "에메랄드",
  DIAMOND: "다이아몬드",
  MASTER: "마스터",
  GRANDMASTER: "그랜드마스터",
  CHALLENGER: "챌린저",
};

const RANK_ROMAN: Record<string, string> = { I: "1", II: "2", III: "3", IV: "4" };

// 이미지1(공식 티어 엠블럼) 색상을 참고한 티어별 텍스트 색상
const TIER_COLOR: Record<string, string> = {
  IRON: "text-stone-400",
  BRONZE: "text-orange-700",
  SILVER: "text-slate-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-teal-300",
  EMERALD: "text-emerald-400",
  DIAMOND: "text-blue-400",
  MASTER: "text-fuchsia-400",
  GRANDMASTER: "text-red-500",
  CHALLENGER: "text-amber-300",
};

function tierColorClass(tier: string | null): string {
  if (!tier) return "text-text-faint";
  return TIER_COLOR[tier] ?? "text-text-faint";
}

function formatRank(tier: string | null, rank: string | null): string {
  if (!tier) return "언랭크";
  const tierLabel = TIER_KOREAN[tier] ?? tier;
  if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier)) return tierLabel;
  return `${tierLabel} ${rank ? (RANK_ROMAN[rank] ?? rank) : ""}`.trim();
}

function sortByPosition(list: MatchParticipant[]): MatchParticipant[] {
  return [...list].sort(
    (a, b) => POSITION_ORDER.indexOf(a.team_position) - POSITION_ORDER.indexOf(b.team_position)
  );
}

function killParticipationOf(p: MatchParticipant, teamKills: number): number {
  return teamKills > 0 ? Math.round(((p.kills + p.assists) / teamKills) * 100) : 0;
}

function TeamScoreBar({
  label,
  win,
  kills,
  gold,
  objectives,
  colorClass,
}: {
  label: string;
  win: boolean;
  kills: number;
  gold: number;
  objectives?: TeamObjectives;
  colorClass: string;
}) {
  return (
    <div className="rounded-md border border-base-border bg-base-surface p-3">
      <p className={`mb-1 text-base font-bold ${colorClass}`}>
        {label} <span className="text-sm font-normal text-text-faint">{win ? "승리" : "패배"}</span>
      </p>
      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>총 킬</span>
        <span className="font-mono text-text-primary">{kills}</span>
      </div>
      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>총 골드</span>
        <span className="font-mono text-text-primary">{gold.toLocaleString()}</span>
      </div>
      {objectives && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-faint">
          <span>바론 {objectives.baron}</span>
          <span>드래곤 {objectives.dragon}</span>
          <span>전령 {objectives.herald}</span>
          <span>타워 {objectives.tower}</span>
          <span>억제기 {objectives.inhibitor}</span>
        </div>
      )}
    </div>
  );
}

function StatBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="mt-0.5 h-1 w-16 overflow-hidden rounded-full bg-base-border">
      <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ParticipantRow({
  p,
  rank,
  teamKills,
  maxDamageDealt,
  maxDamageTaken,
  isViewed,
  onSelectBuild,
}: {
  p: MatchParticipant;
  rank: ParticipantRank | undefined;
  teamKills: number;
  maxDamageDealt: number;
  maxDamageTaken: number;
  isViewed: boolean;
  onSelectBuild: (puuid: string) => void;
}) {
  const kda = p.deaths === 0 ? "Perfect" : ((p.kills + p.assists) / p.deaths).toFixed(2);
  const killParticipation = killParticipationOf(p, teamKills);
  const gameName = p.game_name || rank?.game_name || "";
  const tagLine = p.tag_line || rank?.tag_line || "";

  return (
    <tr
      onClick={() => onSelectBuild(p.puuid)}
      className={`cursor-pointer text-sm transition hover:bg-base-surface ${
        isViewed ? "bg-base-surface/60" : ""
      }`}
    >
      <td className="p-1.5">
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.champion_icon_url} alt="" className="h-9 w-9 rounded-md bg-base-elevated object-cover" />
          <span className="absolute -bottom-1 -right-1 rounded bg-base-border px-1 text-xs leading-tight text-text-primary">
            {p.champion_level}
          </span>
        </div>
      </td>

      <td className="p-1.5">
        <div className="grid grid-cols-2 gap-0.5">
          {[p.spell1_icon_url, p.spell2_icon_url, p.keystone_icon_url, p.sub_style_icon_url].map(
            (url, i) => (
              <div key={i} className="h-4 w-4 overflow-hidden rounded bg-base-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {url && <img src={url} alt="" className="h-full w-full object-cover" />}
              </div>
            )
          )}
        </div>
      </td>

      <td className="whitespace-nowrap p-1.5">
        <div className="rounded border border-base-border px-1.5 py-0.5">
          <SummonerNameLink
            puuid={p.puuid}
            gameName={gameName}
            tagLine={tagLine}
            stopPropagation
            className="text-text-primary hover:underline"
          >
            {gameName || "(알 수 없음)"}
            {tagLine && <span className="text-text-faint">#{tagLine}</span>}
          </SummonerNameLink>
          <p className={`text-xs ${tierColorClass(rank?.tier ?? null)}`}>
            {rank ? formatRank(rank.tier, rank.rank) : "불러오는 중..."}
          </p>
        </div>
      </td>

      <td className="whitespace-nowrap p-1.5 text-center">
        <p className="font-mono text-text-primary">
          {p.kills}/{p.deaths}/{p.assists}
        </p>
      </td>

      <td className="p-1.5 text-center">
        <div className="rounded border border-base-border px-1.5 py-0.5">
          <p className="text-xs text-text-faint">전체 KDA</p>
          <p className="font-mono text-base font-semibold text-text-primary">{kda}</p>
        </div>
      </td>

      <td className="p-1.5 text-center">
        <div className="rounded border border-base-border px-1.5 py-0.5">
          <p className="text-xs text-text-faint">킬 관여율</p>
          <p className="font-mono text-base font-semibold text-text-primary">{killParticipation}%</p>
        </div>
      </td>

      <td className="whitespace-nowrap p-1.5 text-center text-text-muted">
        <p>{p.damage_dealt.toLocaleString()}</p>
        <StatBar value={p.damage_dealt} max={maxDamageDealt} colorClass="bg-accent-loss" />
      </td>

      <td className="whitespace-nowrap p-1.5 text-center text-text-muted">
        <p>{p.damage_taken.toLocaleString()}</p>
        <StatBar value={p.damage_taken} max={maxDamageTaken} colorClass="bg-text-faint" />
      </td>

      <td className="whitespace-nowrap p-1.5 text-center text-text-muted">
        <p>시야 {p.vision_score}</p>
        <p>CS {p.cs}</p>
      </td>

      <td className="p-1.5">
        <div className="grid grid-cols-4 gap-0.5">
          {p.item_icon_urls.slice(0, 3).map((url, i) => (
            <div key={`c${i}`} className="h-5 w-5 overflow-hidden rounded bg-base-elevated">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {url && <img src={url} alt="" className="h-full w-full object-cover" />}
            </div>
          ))}
          <div className="h-5 w-5 overflow-hidden rounded border border-accent-gold/40 bg-base-elevated">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.item_icon_urls[6] && (
              <img src={p.item_icon_urls[6]!} alt="trinket" className="h-full w-full object-cover" />
            )}
          </div>
          {p.item_icon_urls.slice(3, 6).map((url, i) => (
            <div key={`b${i}`} className="h-5 w-5 overflow-hidden rounded bg-base-elevated">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {url && <img src={url} alt="" className="h-full w-full object-cover" />}
            </div>
          ))}
          <div className="h-5 w-5 overflow-hidden rounded border border-blue-400/40 bg-base-elevated">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.highlight_item_icon_url && (
              <img src={p.highlight_item_icon_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function TeamTable({
  label,
  participants,
  ranks,
  teamKills,
  maxDamageDealt,
  maxDamageTaken,
  viewedPuuid,
  onSelectBuild,
  colorClass,
}: {
  label: string;
  participants: MatchParticipant[];
  ranks: Map<string, ParticipantRank>;
  teamKills: number;
  maxDamageDealt: number;
  maxDamageTaken: number;
  viewedPuuid: string;
  onSelectBuild: (puuid: string) => void;
  colorClass: string;
}) {
  return (
    <tbody>
      <tr>
        <td colSpan={9} className={`pb-1 pt-3 text-sm font-semibold first:pt-0 ${colorClass}`}>
          {label}
        </td>
      </tr>
      {participants.map((p) => (
        <ParticipantRow
          key={p.puuid}
          p={p}
          rank={ranks.get(p.puuid)}
          teamKills={teamKills}
          maxDamageDealt={maxDamageDealt}
          maxDamageTaken={maxDamageTaken}
          isViewed={p.puuid === viewedPuuid}
          onSelectBuild={onSelectBuild}
        />
      ))}
    </tbody>
  );
}

export function MatchDetailPanel({ matchId, viewedPuuid }: { matchId: string; viewedPuuid: string }) {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"summary" | "build" | "detail">("summary");
  const [buildPuuid, setBuildPuuid] = useState(viewedPuuid);
  const [ranks, setRanks] = useState<Map<string, ParticipantRank>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getMatchDetail(matchId)
      .then((data) => {
        if (!cancelled) setMatch(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "매치 상세를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  useEffect(() => {
    // 랭크/레벨은 상대적으로 느릴 수 있어서(참가자당 최대 2회 추가 Riot API
    // 호출) 매치 상세와 별도로, 논블로킹으로 불러온다.
    let cancelled = false;
    api
      .getMatchRanks(matchId)
      .then((data) => {
        if (!cancelled) setRanks(new Map(data.map((r) => [r.puuid, r])));
      })
      .catch(() => {
        // 랭크 조회는 실패해도 매치 상세 표시 자체를 막지 않는다.
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (loading) {
    return (
      <p className="mt-2 rounded-card border border-base-border bg-base-elevated p-4 text-sm text-text-muted">
        불러오는 중...
      </p>
    );
  }
  if (error || !match) {
    return (
      <p className="mt-2 rounded-card border border-accent-loss/40 bg-base-elevated p-4 text-sm text-accent-loss">
        {error ?? "매치를 찾을 수 없습니다."}
      </p>
    );
  }

  const blue = sortByPosition(match.participants.filter((p) => p.team_id === 100));
  const red = sortByPosition(match.participants.filter((p) => p.team_id === 200));
  const blueWin = blue[0]?.win ?? false;

  const totalKillsBlue = blue.reduce((sum, p) => sum + p.kills, 0);
  const totalKillsRed = red.reduce((sum, p) => sum + p.kills, 0);
  const totalGoldBlue = blue.reduce((sum, p) => sum + p.gold_earned, 0);
  const totalGoldRed = red.reduce((sum, p) => sum + p.gold_earned, 0);

  const maxDamageDealt = Math.max(...match.participants.map((p) => p.damage_dealt), 1);
  const maxDamageTaken = Math.max(...match.participants.map((p) => p.damage_taken), 1);

  const buildTarget = match.participants.find((p) => p.puuid === buildPuuid) ?? match.participants[0];

  return (
    <div className="mt-2 rounded-card border border-base-border bg-base-elevated p-4">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TeamScoreBar
          label="블루팀"
          win={blueWin}
          kills={totalKillsBlue}
          gold={totalGoldBlue}
          objectives={match.team_objectives["100"]}
          colorClass="text-blue-400"
        />
        <TeamScoreBar
          label="레드팀"
          win={!blueWin}
          kills={totalKillsRed}
          gold={totalGoldRed}
          objectives={match.team_objectives["200"]}
          colorClass="text-accent-loss"
        />
      </div>

      <div className="mb-3 flex gap-1 border-b border-base-border">
        {(
          [
            { key: "summary", label: "종합" },
            { key: "build", label: "빌드" },
            { key: "detail", label: "상세 지표" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "border-b-2 border-accent-gold text-text-primary"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-0.5">
            <TeamTable
              label="블루팀"
              participants={blue}
              ranks={ranks}
              teamKills={totalKillsBlue}
              maxDamageDealt={maxDamageDealt}
              maxDamageTaken={maxDamageTaken}
              viewedPuuid={viewedPuuid}
              onSelectBuild={setBuildPuuid}
              colorClass="text-blue-400"
            />
            <TeamTable
              label="레드팀"
              participants={red}
              ranks={ranks}
              teamKills={totalKillsRed}
              maxDamageDealt={maxDamageDealt}
              maxDamageTaken={maxDamageTaken}
              viewedPuuid={viewedPuuid}
              onSelectBuild={setBuildPuuid}
              colorClass="text-accent-loss"
            />
          </table>
        </div>
      )}

      {tab === "build" && buildTarget && (
        <div>
          <div className="mb-3 flex flex-wrap gap-1">
            {match.participants.map((p) => (
              <button
                key={p.puuid}
                onClick={() => setBuildPuuid(p.puuid)}
                className={`overflow-hidden rounded-md border-2 ${
                  buildPuuid === p.puuid ? "border-accent-gold" : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.champion_icon_url} alt="" className="h-7 w-7 object-cover" />
              </button>
            ))}
          </div>
          <BuildTimeline participant={buildTarget} />
        </div>
      )}

      {tab === "detail" && (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-1 text-sm">
            <thead>
              <tr className="text-left text-text-faint">
                <th className="px-2 pb-1">플레이어</th>
                <th className="px-2 pb-1 font-mono">킬관여율</th>
                <th className="px-2 pb-1 font-mono">가한 피해</th>
                <th className="px-2 pb-1 font-mono">받은 피해</th>
                <th className="px-2 pb-1 font-mono">시야 점수</th>
                <th className="px-2 pb-1 font-mono">제어와드</th>
                <th className="px-2 pb-1 font-mono">더블/트리플/쿼드라/펜타</th>
              </tr>
            </thead>
            <tbody>
              {[...blue, ...red].map((p) => {
                const rank = ranks.get(p.puuid);
                const gameName = p.game_name || rank?.game_name || "";
                const tagLine = p.tag_line || rank?.tag_line || "";
                return (
                <tr key={p.puuid} className="bg-base-surface">
                  <td className="rounded-l-card px-2 py-1.5 text-text-primary">
                    <SummonerNameLink
                      puuid={p.puuid}
                      gameName={gameName}
                      tagLine={tagLine}
                      className="hover:underline"
                    >
                      {gameName || "(알 수 없음)"}
                      {tagLine && `#${tagLine}`}
                    </SummonerNameLink>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-text-muted">
                    {killParticipationOf(p, p.team_id === 100 ? totalKillsBlue : totalKillsRed)}%
                  </td>
                  <td className="px-2 py-1.5 font-mono text-text-muted">
                    {p.damage_dealt.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-text-muted">
                    {p.damage_taken.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-text-muted">{p.vision_score}</td>
                  <td className="px-2 py-1.5 font-mono text-text-muted">{p.vision_wards_bought}</td>
                  <td className="rounded-r-card px-2 py-1.5 font-mono text-text-muted">
                    {p.double_kills}/{p.triple_kills}/{p.quadra_kills}/{p.penta_kills}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
