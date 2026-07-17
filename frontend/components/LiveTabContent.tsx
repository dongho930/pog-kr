"use client";

import { useEffect, useState } from "react";
import { api, LiveGameDetail } from "@/lib/api";
import { LiveGameDetailPanel } from "@/components/LiveGameDetailPanel";
import { LiveTabErrorBoundary } from "@/components/LiveTabErrorBoundary";

/**
 * "인게임 정보" 탭 내용. 참가자 10명 각각을 추가 조회하는 무거운 API라서
 * 페이지 서버 렌더링(SSR) 때 같이 기다리게 하지 않고, 이 컴포넌트가 화면에
 * 나타난 뒤 브라우저에서 따로 불러온다 — SSR 도중 시간이 오래 걸려서
 * 호스팅 플랫폼의 함수 실행 시간 제한에 걸려 페이지 전체가 죽는 문제를
 * 피하기 위함.
 */
export function LiveTabContent({ puuid }: { puuid: string }) {
  const [detail, setDetail] = useState<LiveGameDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getLiveGameDetail(puuid)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "인게임 정보를 불러오지 못했어요.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [puuid]);

  if (loading) {
    return (
      <div className="rounded-card border border-base-border bg-base-surface p-8 text-center text-sm text-text-muted">
        불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-card border border-base-border bg-base-surface p-4 text-sm text-text-muted">
        {error}
      </div>
    );
  }

  if (!detail?.in_game || !detail.participants || detail.participants.length === 0) {
    return (
      <div className="rounded-card border border-base-border bg-base-surface p-4 text-sm text-text-muted">
        현재 게임 중이 아닙니다.
      </div>
    );
  }

  return (
    <LiveTabErrorBoundary
      fallback={
        <div className="rounded-card border border-base-border bg-base-surface p-4 text-sm text-text-muted">
          인게임 정보를 표시하는 중 문제가 발생했어요.
        </div>
      }
    >
      <div className="overflow-hidden rounded-card border border-base-border bg-base-surface">
        <LiveGameDetailPanel
          queueLabel={detail.queue_label}
          mapLabel={detail.map_label}
          gameLengthSeconds={detail.game_length_seconds}
          participants={detail.participants}
          bans={detail.bans}
        />
      </div>
    </LiveTabErrorBoundary>
  );
}
