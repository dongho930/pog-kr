/**
 * pog.kr의 시그니처 UI 요소.
 * 최근 N경기의 승/패를 점(pip)으로 표시하고, 가장 최근 경기에 발광 효과를 준다.
 * 단순 장식이 아니라 "최근 폼(상승세/하락세)"이라는 실제 정보를 압축해 보여준다 —
 * 연승 중이면 점들이 오른쪽으로 갈수록 골드색으로 이어지고, 연패 중이면
 * 붉은색이 이어지는 방식으로 "흐름"을 시각화한다.
 */
export function FormStreak({ results }: { results: boolean[] /* true = win */ }) {
  return (
    <div className="flex items-center gap-1.5" aria-label="최근 경기 폼">
      {results.map((win, i) => {
        const isLatest = i === results.length - 1;
        return (
          <span
            key={i}
            className={`h-2 w-2 rounded-full transition-all ${
              win ? "bg-accent-win" : "bg-accent-loss"
            } ${isLatest ? "h-2.5 w-2.5 shadow-[0_0_6px_2px_rgba(232,179,76,0.55)]" : "opacity-70"}`}
            title={win ? "승리" : "패배"}
          />
        );
      })}
    </div>
  );
}
