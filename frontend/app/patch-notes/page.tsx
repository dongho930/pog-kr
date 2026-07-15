import { api } from "@/lib/api";

const CHANGE_BADGE: Record<string, { label: string; bg: string; icon: string }> = {
  buff: { label: "버프", bg: "bg-accent-win", icon: "▲" },
  nerf: { label: "너프", bg: "bg-accent-loss", icon: "▼" },
  new: { label: "신규", bg: "bg-accent-gold", icon: "★" },
  adjustment: { label: "조정", bg: "bg-text-faint", icon: "●" },
};

export default async function PatchNotesPage() {
  let data: Awaited<ReturnType<typeof api.getLatestPatchNotes>> | null = null;
  let fetchError: string | null = null;

  try {
    data = await api.getLatestPatchNotes();
  } catch (e) {
    fetchError = e instanceof Error ? e.message : "패치 노트를 불러오지 못했습니다.";
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-display text-2xl font-bold text-text-primary">패치 노트</h1>

      {fetchError || data?.error ? (
        <div className="rounded-card border border-accent-loss/40 bg-base-surface p-6 text-center">
          <p className="text-sm font-semibold text-accent-loss">패치 노트를 불러오지 못했어요</p>
          <p className="mt-2 text-sm text-text-muted">{fetchError ?? data?.error}</p>
        </div>
      ) : !data || data.champions.length === 0 ? (
        <div className="rounded-card border border-base-border bg-base-surface p-6 text-center text-sm text-text-muted">
          이번 패치의 챔피언 밸런싱 정보를 찾지 못했어요.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-base-border">
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
              공식 패치 노트 →
            </a>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-base-surface p-6 sm:grid-cols-4 md:grid-cols-6">
            {data.champions.map((c) => {
              const badge = CHANGE_BADGE[c.change_type] ?? CHANGE_BADGE.adjustment;
              return (
                <div key={c.champion_id} className="flex flex-col items-center gap-1.5">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.icon_url}
                      alt={c.champion_name}
                      className="h-14 w-14 rounded-full border border-base-border bg-base-elevated object-cover"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white ${badge.bg}`}
                      title={badge.label}
                    >
                      {badge.icon}
                    </span>
                  </div>
                  <span className="max-w-[80px] truncate text-xs text-text-muted">
                    {c.champion_name}
                  </span>
                  <span className="text-[10px] text-text-faint">{badge.label}</span>
                </div>
              );
            })}
          </div>

          <p className="bg-base-surface px-6 pb-4 text-[11px] text-text-faint">
            자동으로 요약된 정보라 실제와 다를 수 있어요. 정확한 내용은 공식 패치 노트를 확인하세요.
          </p>
        </div>
      )}
    </div>
  );
}
