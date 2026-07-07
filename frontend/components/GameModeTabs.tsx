"use client";

import { GameMode, GameModeKey } from "@/lib/gameModes";

export function GameModeTabs({
  modes,
  active,
  onChange,
}: {
  modes: GameMode[];
  active: GameModeKey;
  onChange: (key: GameModeKey) => void;
}) {
  return (
    <div className="mb-3 flex gap-1 overflow-x-auto border-b border-base-border pb-px">
      {modes.map((mode) => (
        <button
          key={mode.key}
          onClick={() => onChange(mode.key)}
          className={`whitespace-nowrap px-3 py-2 text-sm font-medium transition ${
            active === mode.key
              ? "border-b-2 border-accent-gold text-text-primary"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
