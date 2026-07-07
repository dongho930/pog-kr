"use client";

import { useState } from "react";
import { Match } from "@/lib/api";
import { formatDuration, formatRelativeDate } from "@/lib/formatters";
import { MatchDetailPanel } from "./MatchDetailPanel";

const QUEUE_LABEL: Record<number, string> = {
  400: "일반(드래프트)",
  420: "솔로랭크",
  430: "일반(블라인드)",
  440: "자유랭크",
  450: "칼바람 나락",
  490: "빠른 대전",
  700: "격전",
  900: "우르프",
  1020: "돌격 넥서스",
  1300: "넥서스 블리츠",
  1400: "궁극기 주문서",
  1700: "아레나",
  1710: "아레나",
  1750: "아레나",
  1900: "우르프",
};

/** 요청 스펙: KDA 3.0+ 빨강, 2.0+ 파랑, 1.0+ 초록, 0.0+ 회색. */
function kdaColorClass(kda: number): string {
  if (kda >= 3.0) return "text-accent-loss";
  if (kda >= 2.0) return "text-blue-400";
  if (kda >= 1.0) return "text-accent-win";
  return "text-text-muted";
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-4 w-4 shrink-0 text-text-faint transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const COLUMN_COUNT = 8;

export function MatchHistoryItem({ match, puuid }: { match: Match; puuid: string }) {
  const [open, setOpen] = useState(false);
  const me = match.participants.find((p) => p.puuid === puuid);
  if (!me) return null;

  const kdaNumber = me.deaths === 0 ? Infinity : (me.kills + me.assists) / me.deaths;
  const kdaLabel = me.deaths === 0 ? "Perfect" : kdaNumber.toFixed(2);

  const teamKills = match.participants
    .filter((p) => p.team_id === me.team_id)
    .reduce((sum, p) => sum + p.kills, 0);
  const killParticipation =
    teamKills > 0 ? Math.round(((me.kills + me.assists) / teamKills) * 100) : 0;

  const csPerMin = match.game_duration > 0 ? (me.cs / (match.game_duration / 60)).toFixed(1) : "0.0";

  return (
    <>
      <tr
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer bg-base-surface text-center transition hover:bg-base-elevated"
      >
        {/* 결과 / 모드 / 시간 / 며칠 전 */}
        <td
          className={`whitespace-nowrap rounded-l-card border-l-4 p-3 ${
            me.win ? "border-l-accent-win" : "border-l-accent-loss"
          }`}
        >
          <p className={`text-base font-semibold ${me.win ? "text-accent-win" : "text-accent-loss"}`}>
            {me.win ? "승리" : "패배"}
          </p>
          <p className="text-sm text-text-faint">{QUEUE_LABEL[match.queue_id] ?? `큐 ${match.queue_id}`}</p>
          <p className="text-sm text-text-faint">{formatDuration(match.game_duration)}</p>
          <p className="text-sm text-text-faint">{formatRelativeDate(match.game_creation)}</p>
        </td>

        {/* 초상화 (확대) */}
        <td className="p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={me.champion_icon_url}
            alt={`champion-${me.champion_id}`}
            className="mx-auto h-14 w-14 rounded-md bg-base-elevated object-cover"
          />
        </td>

        {/* 스펠 + 룬 2x2 (스펠1/스펠2, 주룬/보조룬) */}
        <td className="p-3">
          <div className="mx-auto grid w-fit grid-cols-2 gap-0.5">
            {[me.spell1_icon_url, me.spell2_icon_url, me.keystone_icon_url, me.sub_style_icon_url].map(
              (url, i) => (
                <div key={i} className="h-5 w-5 overflow-hidden rounded bg-base-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {url && <img src={url} alt="" className="h-full w-full object-cover" />}
                </div>
              )
            )}
          </div>
        </td>

        {/* KDA */}
        <td className="whitespace-nowrap p-3">
          <p className="font-mono text-base text-text-primary">
            {me.kills} / {me.deaths} / {me.assists}
          </p>
          <p className={`font-mono text-lg font-bold ${kdaColorClass(kdaNumber)}`}>
            {kdaLabel} KDA
          </p>
        </td>

        {/* 킬관여율 */}
        <td className="whitespace-nowrap p-3">
          <p className="text-sm text-text-faint">킬관여율</p>
          <p className="font-mono text-lg font-bold text-text-primary">{killParticipation}%</p>
        </td>

        {/* CS/골드, 시야점수/제어와드 */}
        <td className="whitespace-nowrap p-3 text-left text-sm text-text-muted">
          <p>
            <span className="font-bold text-text-primary">CS {me.cs}</span> ({csPerMin}/분) · 골드{" "}
            {me.gold_earned.toLocaleString()}
          </p>
          <p>시야 {me.vision_score} · 제어와드 {me.vision_wards_bought}구매</p>
        </td>

        {/* 아이템: 코어 6개 + 1행 4번째 칸은 장신구(와드/렌즈 등) 전용, 2행 4번째 칸은 라인별 강조 아이템 */}
        <td className="p-3">
          <div className="mx-auto grid w-fit grid-cols-4 grid-rows-2 gap-1">
            {me.item_icon_urls.slice(0, 3).map((url, i) => (
              <div
                key={`core-top-${i}`}
                className="h-6 w-6 overflow-hidden rounded border border-base-border bg-base-elevated"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {url && <img src={url} alt={`item-${i}`} className="h-full w-full object-cover" />}
              </div>
            ))}

            <div className="h-6 w-6 overflow-hidden rounded border border-accent-gold/40 bg-base-elevated">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {me.item_icon_urls[6] && (
                <img src={me.item_icon_urls[6]!} alt="trinket" className="h-full w-full object-cover" />
              )}
            </div>

            {me.item_icon_urls.slice(3, 6).map((url, i) => (
              <div
                key={`core-bottom-${i}`}
                className="h-6 w-6 overflow-hidden rounded border border-base-border bg-base-elevated"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {url && <img src={url} alt={`item-${i + 3}`} className="h-full w-full object-cover" />}
              </div>
            ))}

            <div className="h-6 w-6 overflow-hidden rounded border border-blue-400/40 bg-base-elevated">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {me.highlight_item_icon_url && (
                <img src={me.highlight_item_icon_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
          </div>
        </td>

        <td className="rounded-r-card p-3">
          <ChevronIcon open={open} />
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={COLUMN_COUNT} className="p-0">
            <MatchDetailPanel matchId={match.match_id} viewedPuuid={puuid} />
          </td>
        </tr>
      )}
    </>
  );
}
