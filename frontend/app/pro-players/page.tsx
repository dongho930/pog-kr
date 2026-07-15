import { api } from "@/lib/api";
import { ProPlayersList } from "@/components/ProPlayersList";

export default async function ProPlayersPage() {
  let players: Awaited<ReturnType<typeof api.getProPlayers>> = [];
  let error: string | null = null;

  try {
    players = await api.getProPlayers();
  } catch (e) {
    error = e instanceof Error ? e.message : "프로게이머 목록을 불러오지 못했습니다.";
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 font-display text-2xl font-bold text-text-primary">프로 관전</h1>
      <p className="mb-6 text-sm text-text-muted">
        등록된 프로게이머의 실시간 게임 진행 상태와 인게임 정보를 확인할 수 있어요.
      </p>

      {error ? (
        <div className="rounded-card border border-accent-loss/40 bg-base-surface p-6 text-center">
          <p className="text-sm font-semibold text-accent-loss">목록을 불러오지 못했어요</p>
          <p className="mt-2 text-sm text-text-muted">{error}</p>
        </div>
      ) : (
        <ProPlayersList players={players} />
      )}
    </div>
  );
}
