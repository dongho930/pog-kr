export default function PatchNotesPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-display text-2xl font-bold text-text-primary">패치 노트</h1>

      <div className="rounded-card border border-base-border bg-base-surface p-10 text-center">
        <p className="text-base font-semibold text-text-primary">준비 중이에요</p>
        <p className="mt-2 text-sm text-text-muted">
          챔피언 밸런싱 자동 요약 기능은 현재 점검 중이에요. 곧 더 안정적인 방식으로 다시
          찾아올게요.
        </p>
        <a
          href="https://www.leagueoflegends.com/en-us/news/tags/patch-notes/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm text-accent-gold hover:underline"
        >
          그동안 Riot 공식 패치 노트 보러 가기 →
        </a>
      </div>
    </div>
  );
}
