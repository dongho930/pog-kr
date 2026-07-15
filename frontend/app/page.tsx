import { SearchBar } from "@/components/SearchBar";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <h1 className="font-display text-4xl font-bold text-text-primary sm:text-5xl">
        오늘 경기, <span className="text-accent-gold">복기할 준비</span> 됐나요?
      </h1>
      <p className="mt-3 text-text-muted">
        소환사 전적 · 매치 히스토리 · 실시간 전적 · 챔피언 통계 · 빌드 타임라인
      </p>

      <div className="mt-8 w-full max-w-xl">
        <SearchBar />
      </div>

      <p className="mt-3 text-xs text-text-faint">
        게임명#태그 형식으로 검색하세요 (예: Hide on bush#KR1)
      </p>
    </div>
  );
}
