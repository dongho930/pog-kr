import { api } from "@/lib/api";

const CHANGE_BADGE: Record<string, { label: string; bg: string; icon: string }> = {
  buff: { label: "버프", bg: "bg-accent-win", icon: "▲" },
  nerf: { label: "너프", bg: "bg-accent-loss", icon: "▼" },
  new: { label: "신규", bg: "bg-accent-gold", icon: "★" },
  adjustment: { label: "조정", bg: "bg-text-faint", icon: "●" },
};

/**
 * 홈페이지 상단의 "이번 패치 챔피언 밸런싱" 요약 위젯.
 * 백엔드가 LoL 공식 위키를 스크래핑해 챔피언별 버프/너프/신규 여부를
 * 휴리스틱으로 분류한 결과를 보여준다 (실험적 기능 — 완벽하지 않을 수 있음).
 */
export async function PatchNotesSummary() {
  let data;
  try {
    data = await api.getLatestPatchNotes();
  } catch {
    return null; // 실패해도 홈페이지 전체에 영향 주지 않고 조용히 숨김
  }

  if (!data.champions.length) return null;

  return (
    <div className="w-full overflow-hidden rounded-card border border-base-border">
      <div className="flex items-center justify-between bg-gradient-to-r from-[#2a3358] to-[#1c2230] px-6 py-4">
        <h2 className="font-display text-lg font-bold text-text-primary">
          v{data.patch} 챔피언 밸런싱
        </h2>
        <a
          href={data.patch_notes_url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-base-surface px-4 py-1.5 text-sm font-semibold text-text-primary hover:bg-base-elevated"
        >
          패치 노트 →
        </a>
      </div>

      <div className="flex gap-5 overflow-x-auto bg-base-surface px-6 py-4">
        {data.champions.map((c) => {
          const badge = CHANGE_BADGE[c.change_type] ?? CHANGE_BADGE.adjustment;
          return (
            <div key={c.champion_id} className="flex shrink-0 flex-col items-center gap-1.5">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.icon_url}
                  alt={c.champion_name}
                  className="h-12 w-12 rounded-full border border-base-border bg-base-elevated object-cover"
                />
                <span
                  className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white ${badge.bg}`}
                  title={badge.label}
                >
                  {badge.icon}
                </span>
              </div>
              <span className="max-w-[64px] truncate text-xs text-text-muted">
                {c.champion_name}
              </span>
            </div>
          );
        })}
      </div>

      <p className="bg-base-surface px-6 pb-3 text-[11px] text-text-faint">
        자동으로 요약된 정보라 실제와 다를 수 있어요. 정확한 내용은 패치 노트를 확인하세요.
      </p>
    </div>
  );
}
