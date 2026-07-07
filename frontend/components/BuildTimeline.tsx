import { MatchParticipant } from "@/lib/api";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BuildTimeline({ participant }: { participant: MatchParticipant }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-text-muted">스킬 빌드 순서</h3>
        <div className="flex flex-wrap gap-2">
          {participant.skill_order.map((entry, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-base-border bg-base-elevated font-display font-bold text-accent-gold">
                {entry.skill}
              </div>
              <span className="mt-1 font-mono text-[10px] text-text-faint">
                Lv.{entry.level} · {formatTime(entry.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-text-muted">아이템 구매 타임라인</h3>
        <div className="flex flex-wrap gap-3">
          {participant.item_timeline.map((entry, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="h-10 w-10 overflow-hidden rounded border border-base-border bg-base-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {entry.item_icon_url && (
                  <img
                    src={entry.item_icon_url}
                    alt={`item-${entry.item_id}`}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <span className="mt-1 font-mono text-[10px] text-text-faint">
                {formatTime(entry.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-text-muted">룬</h3>
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={participant.primary_style_icon_url ?? undefined}
                alt="주 룬트리"
                className="h-4 w-4 object-contain"
              />
              <span className="text-[10px] text-text-faint">주 룬트리</span>
            </div>
            <div className="flex gap-2">
              {participant.primary_rune_icon_urls.map((url, i) => (
                <div
                  key={i}
                  className={`overflow-hidden rounded-full border bg-base-elevated ${
                    i === 0
                      ? "h-11 w-11 border-accent-gold/60"
                      : "h-8 w-8 self-end border-base-border"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {url && <img src={url} alt="" className="h-full w-full object-cover" />}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={participant.sub_style_icon_url ?? undefined}
                alt="보조 룬트리"
                className="h-4 w-4 object-contain"
              />
              <span className="text-[10px] text-text-faint">보조 룬트리</span>
            </div>
            <div className="flex gap-2">
              {participant.secondary_rune_icon_urls.map((url, i) => (
                <div
                  key={i}
                  className="h-8 w-8 overflow-hidden rounded-full border border-base-border bg-base-elevated"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {url && <img src={url} alt="" className="h-full w-full object-cover" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
