import { RankHistoryPoint } from "@/lib/api";

const TIER_KOREAN: Record<string, string> = {
  IRON: "아이언",
  BRONZE: "브론즈",
  SILVER: "실버",
  GOLD: "골드",
  PLATINUM: "플래티넘",
  EMERALD: "에메랄드",
  DIAMOND: "다이아몬드",
  MASTER: "마스터",
  GRANDMASTER: "그랜드마스터",
  CHALLENGER: "챌린저",
};

function formatDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

/**
 * 소환사 카드 아래에 표시하는 티어 변화 그래프.
 * Riot API가 과거 랭크 기록을 주지 않기 때문에, 이 소환사가 조회될 때마다
 * 백엔드가 하루 1개씩 쌓아온 스냅샷만 그린다 — 그래서 최근에 처음 검색된
 * 소환사는 점이 거의 없을 수 있다 (앞으로 조회될수록 그래프가 채워진다).
 */
export function RankHistoryChart({
  history,
  queueLabel = "솔로랭크",
}: {
  history: RankHistoryPoint[];
  queueLabel?: string;
}) {
  if (history.length < 2) {
    return (
      <div className="mt-4 rounded-card border border-base-border bg-base-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-text-muted">{queueLabel} 티어 변화</h2>
        <p className="py-6 text-center text-xs text-text-faint">
          아직 기록이 부족해요. 이 소환사가 검색될 때마다 하루 1개씩 기록이 쌓여서,
          시간이 지나면 그래프가 채워져요.
        </p>
      </div>
    );
  }

  const width = 620;
  const height = 180;
  const padTop = 16;
  const padBottom = 28;
  const padX = 8;

  const scores = history.map((p) => p.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const scoreRange = maxScore - minScore || 1;

  const stepX = (width - padX * 2) / (history.length - 1);
  const points = history.map((p, i) => {
    const x = padX + i * stepX;
    const y =
      padTop + (1 - (p.score - minScore) / scoreRange) * (height - padTop - padBottom);
    return { x, y, p };
  });

  const linePath = points.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
  const areaPath =
    `M ${points[0].x} ${height - padBottom} ` +
    points.map((pt) => `L ${pt.x} ${pt.y}`).join(" ") +
    ` L ${points[points.length - 1].x} ${height - padBottom} Z`;

  // x축 라벨은 너무 촘촘해지지 않도록 최대 6개 정도만 뽑아서 보여준다.
  const labelEvery = Math.max(1, Math.ceil(history.length / 6));

  const latest = history[history.length - 1];

  return (
    <div className="mt-4 rounded-card border border-base-border bg-base-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted">{queueLabel} 티어 변화</h2>
        {latest.tier && (
          <span className="text-xs text-text-faint">
            현재 {TIER_KOREAN[latest.tier] ?? latest.tier} {latest.rank ?? ""} {latest.lp}LP
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rankHistoryFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e5555a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#e5555a" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#rankHistoryFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#e5555a"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r="2.5" fill="#e5555a" />
        ))}

        {points.map((pt, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={i} x={pt.x} y={height - 8} textAnchor="middle" fontSize="10" fill="#5B6478">
              {formatDate(pt.p.date)}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}
