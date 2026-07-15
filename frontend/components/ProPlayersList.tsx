"use client";

import { useState } from "react";
import { api, LiveGameDetail, ProPlayerLive } from "@/lib/api";
import { tierEmblemUrl } from "@/lib/rankIcons";
import { LiveGameDetailPanel } from "@/components/LiveGameDetailPanel";

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

function formatDuration(seconds?: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function summonerHref(gameName: string, tagLine: string): string {
  return `/summoners/kr/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;
}

export function ProPlayersList({ players }: { players: ProPlayerLive[] }) {
  const [tab, setTab] = useState<"live" | "all">("live");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const livePlayers = players.filter((p) => p.in_game);
  const shown = tab === "live" ? livePlayers : players;

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-base-border">
        <TabButton active={tab === "live"} onClick={() => setTab("live")}>
          관전{livePlayers.length > 0 && ` (${livePlayers.length})`}
        </TabButton>
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          등록된 소환사
        </TabButton>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-card border border-base-border bg-base-surface p-8 text-center text-sm text-text-muted">
          {tab === "live"
            ? "현재 게임 중인 등록된 프로게이머가 없어요."
            : "등록된 프로게이머가 없어요."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <ProPlayerCard
              key={p.id}
              player={p}
              expanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-accent-gold text-text-primary"
          : "border-transparent text-text-muted hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function ProPlayerCard({
  player,
  expanded,
  onToggle,
}: {
  player: ProPlayerLive;
  expanded: boolean;
  onToggle: () => void;
}) {
  const emblemUrl = tierEmblemUrl(player.tier ?? null);
  const self = player.participants?.find((p) => p.puuid === player.puuid);
  const [detail, setDetail] = useState<LiveGameDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function handleToggle() {
    onToggle();
    if (expanded || detail || !player.puuid) return; // 이미 열려있거나 이미 불러왔으면 재요청 안 함
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const result = await api.getLiveGameDetail(player.puuid);
      setDetail(result);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "인게임 정보를 불러오지 못했어요.");
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={self?.champion_icon_url ?? player.profile_icon_url ?? "/positions/utility.svg"}
            alt=""
            className="h-12 w-12 rounded-full border border-base-border bg-base-elevated object-cover"
          />
          {player.in_game && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-base-surface bg-accent-win" />
          )}
        </div>
        <div className="min-w-0">
          <a
            href={summonerHref(player.game_name, player.tag_line)}
            className="truncate text-sm font-semibold text-text-primary hover:underline"
          >
            {player.game_name}
            <span className="text-text-faint"> #{player.tag_line}</span>
          </a>
          {emblemUrl && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={emblemUrl} alt="" className="h-4 w-4 object-contain" />
              {TIER_KOREAN[player.tier ?? ""] ?? player.tier} {player.rank}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 text-xs text-text-muted">
        <span className="rounded bg-base-elevated px-1.5 py-0.5 font-semibold text-accent-gold">
          프로게이머
        </span>{" "}
        <span className="text-text-primary">{player.real_name}</span>
        {player.team && <span className="text-text-faint"> · {player.team}</span>}
      </div>

      {!player.found ? (
        <p className="mt-3 text-xs text-accent-loss">계정을 찾을 수 없어요 (닉네임#태그 확인 필요)</p>
      ) : player.in_game ? (
        <p className="mt-3 text-xs text-text-muted">
          <span className="text-accent-win">● 게임 중</span> · {player.game_mode} ·{" "}
          {formatDuration(player.game_length_seconds)} 경과
        </p>
      ) : (
        <p className="mt-3 text-xs text-text-faint">현재 게임 중이 아니에요.</p>
      )}

      {player.in_game && (
        <>
          <button
            type="button"
            onClick={handleToggle}
            className="mt-3 w-full rounded-md border border-base-border py-1.5 text-xs font-semibold text-text-primary hover:bg-base-elevated"
          >
            {expanded ? "인게임 정보 닫기" : "인게임 정보 / 관전 정보 보기"}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              {loadingDetail && (
                <p className="py-4 text-center text-xs text-text-muted">불러오는 중...</p>
              )}
              {detailError && <p className="py-2 text-center text-xs text-accent-loss">{detailError}</p>}
              {detail && detail.in_game && detail.participants && (
                <LiveGameDetailPanel
                  queueLabel={detail.queue_label}
                  mapLabel={detail.map_label}
                  gameLengthSeconds={detail.game_length_seconds}
                  participants={detail.participants}
                />
              )}

              {player.spectate && (
                <div className="rounded-md bg-base-elevated p-2.5 text-[11px] text-text-faint">
                  <p className="mb-1 font-semibold text-text-muted">관전 정보 (고급 사용자용)</p>
                  <p>게임 ID: {player.spectate.game_id}</p>
                  <p>플랫폼: {player.spectate.platform_id}</p>
                  <p className="truncate">암호화 키: {player.spectate.encryption_key}</p>
                  <p className="mt-1.5 text-text-faint">
                    이 정보는 League 클라이언트로 직접 관전할 때 필요한 값이에요. 브라우저에서
                    바로 재생되진 않고, 클라이언트 버전에 따라 연결 방법이 달라질 수 있어요.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
