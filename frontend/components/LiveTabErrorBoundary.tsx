"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * 인게임 정보 패널(LiveGameDetailPanel)에서 예상치 못한 렌더링 오류가 나도
 * 페이지 전체("Application error")로 번지지 않도록 격리한다.
 */
export class LiveTabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("인게임 정보 패널 렌더링 오류:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
