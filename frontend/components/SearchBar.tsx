"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** "%20"처럼 이미 URL 인코딩된 텍스트를 실수로 붙여넣은 경우 원래 형태로
 * 되돌린다 (이중 인코딩 방지). 일반 텍스트라면 그대로 반환한다. */
function normalizeInput(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = normalizeInput(value.trim());
    if (!trimmed.includes("#")) return;
    const [gameName, tagLine] = trimmed.split("#");
    router.push(`/summoners/kr/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 rounded-card border border-base-border bg-base-surface px-4 ${
        compact ? "h-11" : "h-14"
      }`}
    >
      <span className="text-text-faint">🔍</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="게임명#태그 (예: Hide on bush#KR1)"
        className="flex-1 bg-transparent font-body text-text-primary placeholder:text-text-faint focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-md bg-accent-gold px-4 py-1.5 text-sm font-semibold text-[#171207] transition hover:brightness-110"
      >
        검색
      </button>
    </form>
  );
}
