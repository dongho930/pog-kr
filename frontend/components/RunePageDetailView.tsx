import { ChampionRunePageDetail, RuneOption, RuneRow } from "@/lib/api";

function OptionIcon({ option, size = "h-10 w-10" }: { option: RuneOption; size?: string }) {
  return (
    <div
      className={`${size} overflow-hidden rounded-full border ${
        option.chosen
          ? "border-accent-gold bg-base-elevated"
          : "border-base-border bg-base-elevated grayscale opacity-40"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {option.icon_url && <img src={option.icon_url} alt="" className="h-full w-full object-cover" />}
    </div>
  );
}

function Row({ row, size }: { row: RuneRow; size?: string }) {
  return (
    <div className="flex justify-center gap-3">
      {row.options.map((opt, i) => (
        <OptionIcon key={i} option={opt} size={size} />
      ))}
    </div>
  );
}

function StyleIconRow({
  styleIds,
  iconUrls,
  activeStyleId,
}: {
  styleIds: number[];
  iconUrls: Record<string, string | null>;
  activeStyleId: number;
}) {
  return (
    <div className="flex justify-center gap-3">
      {styleIds.map((id) => (
        <div
          key={id}
          className={`h-9 w-9 overflow-hidden rounded-full border ${
            id === activeStyleId
              ? "border-accent-gold bg-base-elevated"
              : "border-base-border bg-base-elevated grayscale opacity-40"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {iconUrls[id] && <img src={iconUrls[id]!} alt="" className="h-full w-full object-cover" />}
        </div>
      ))}
    </div>
  );
}

export function RunePageDetailView({ detail }: { detail: ChampionRunePageDetail }) {
  return (
    <div className="rounded-card border border-base-border bg-base-surface p-5">
      <p className="mb-4 text-center text-xs text-text-faint">
        이 조합으로 수집된 매치 {detail.games}경기 기준 — 실제 클라이언트 룬 페이지처럼, 이
        조합에서 가장 많이 선택된 룬만 색이 있고 나머지는 흑백으로 표시돼요.
      </p>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* 주 룬트리 */}
        <div>
          <StyleIconRow
            styleIds={detail.all_style_ids}
            iconUrls={detail.all_style_icon_urls}
            activeStyleId={detail.primary_style}
          />
          <div className="mt-4 space-y-4">
            {detail.primary_rows.map((row, i) => (
              <Row key={i} row={row} size={i === 0 ? "h-11 w-11" : "h-9 w-9"} />
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-text-faint">주 룬트리</p>
        </div>

        {/* 보조 룬트리 */}
        <div>
          <StyleIconRow
            styleIds={detail.all_style_ids}
            iconUrls={detail.all_style_icon_urls}
            activeStyleId={detail.sub_style}
          />
          <div className="mt-4 space-y-4">
            {detail.secondary_rows.map((row, i) => (
              <Row key={i} row={row} size="h-9 w-9" />
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-text-faint">보조 룬트리</p>
        </div>
      </div>
    </div>
  );
}
