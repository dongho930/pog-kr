"use client";

import { SubMode } from "@/lib/gameModes";

export function SubModeTabs({
  subModes,
  active,
  onChange,
}: {
  subModes: SubMode[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="mb-3 flex gap-2 overflow-x-auto">
      {subModes.map((sub) => (
        <button
          key={sub.key}
          onClick={() => onChange(sub.key)}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
            active === sub.key
              ? "bg-accent-gold text-[#171207]"
              : "bg-base-elevated text-text-muted hover:text-text-primary"
          }`}
        >
          {sub.label}
        </button>
      ))}
    </div>
  );
}
