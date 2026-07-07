"use client";

import { useState } from "react";

export type TabKey = "matches" | "live" | "champions";

const TABS: { key: TabKey; label: string }[] = [
  { key: "matches", label: "매치 히스토리" },
  { key: "live", label: "실시간 전적" },
  { key: "champions", label: "챔피언 통계" },
];

export function TabNav({
  matchesContent,
  liveContent,
  championsContent,
}: {
  matchesContent: React.ReactNode;
  liveContent: React.ReactNode;
  championsContent: React.ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("matches");

  const content =
    active === "matches" ? matchesContent : active === "live" ? liveContent : championsContent;

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-base-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              active === tab.key
                ? "border-b-2 border-accent-gold text-text-primary"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {content}
    </div>
  );
}
