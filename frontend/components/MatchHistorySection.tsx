"use client";

import { useMemo, useState } from "react";
import { Match } from "@/lib/api";
import { GAME_MODES, GameModeKey, getEffectiveQueueIds, getGameMode } from "@/lib/gameModes";
import { GameModeTabs } from "./GameModeTabs";
import { SubModeTabs } from "./SubModeTabs";
import { MatchHistoryItem } from "./MatchHistoryItem";

export function MatchHistorySection({ matches, puuid }: { matches: Match[]; puuid: string }) {
  const [mode, setMode] = useState<GameModeKey>("ALL");
  const [subMode, setSubMode] = useState<string>("ALL");

  const currentMode = getGameMode(mode);

  function handleModeChange(next: GameModeKey) {
    setMode(next);
    setSubMode("ALL"); // 상위 모드를 바꾸면 서브 필터는 "전체"로 초기화
  }

  const filtered = useMemo(() => {
    const queueIds = getEffectiveQueueIds(mode, subMode);
    if (!queueIds) return matches;
    const idSet = new Set(queueIds);
    return matches.filter((m) => idSet.has(m.queue_id));
  }, [matches, mode, subMode]);

  return (
    <div>
      <GameModeTabs modes={GAME_MODES} active={mode} onChange={handleModeChange} />
      {currentMode.subModes && (
        <SubModeTabs subModes={currentMode.subModes} active={subMode} onChange={setSubMode} />
      )}
      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted">전적 기록이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "104px" }} />
              <col style={{ width: "64px" }} />
              <col style={{ width: "58px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "78px" }} />
              <col style={{ width: "175px" }} />
              <col style={{ width: "128px" }} />
              <col style={{ width: "32px" }} />
            </colgroup>
            <tbody>
              {filtered.map((m) => (
                <MatchHistoryItem key={m.match_id} match={m} puuid={puuid} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
