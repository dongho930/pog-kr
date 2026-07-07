import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // pog.kr 오리지널 다크 팔레트 — 리그 오브 레전드의 골드/네이비 정체성에서
        // 출발했지만 poro.gg 등 어떤 사이트의 실제 색상값도 그대로 쓰지 않음.
        base: {
          bg: "#0B0E14",       // 페이지 배경
          surface: "#151A24",  // 카드/패널
          elevated: "#1C2230", // 호버/모달 표면
          border: "#232A38",
        },
        accent: {
          gold: "#E8B34C",    // 랭크/티어 강조
          win: "#35C48F",     // 승리
          loss: "#E5555A",    // 패배
        },
        text: {
          primary: "#EDEFF4",
          muted: "#8891A3",
          faint: "#5B6478",
        },
      },
      fontFamily: {
        display: ["var(--font-chakra)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jbmono)", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
