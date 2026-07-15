import type { Metadata } from "next";
import { Chakra_Petch, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jbmono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono" });

export const metadata: Metadata = {
  title: "POG.KR — 롤 전적 검색",
  description: "소환사 전적, 매치 히스토리, 실시간 전적, 챔피언 통계, 빌드/스킬 타임라인",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body
        className={`${chakra.variable} ${inter.variable} ${jbmono.variable} font-body antialiased`}
      >
        <header className="border-b border-base-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <a href="/" className="font-display text-xl font-bold tracking-wide text-text-primary">
              POG<span className="text-accent-gold">.KR</span>
            </a>
            <nav className="flex gap-6 text-sm text-text-muted">
              <a href="/leaderboard" className="hover:text-text-primary">랭킹</a>
              <a href="/tier-list" className="hover:text-text-primary">챔피언 티어</a>
              <a href="/patch-notes" className="hover:text-text-primary">패치 노트</a>
              <a href="/pro-players" className="hover:text-text-primary">프로 관전</a>
              <a href="/" className="hover:text-text-primary">소환사 검색</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
