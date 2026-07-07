import { api } from "@/lib/api";

export default async function ChampionBuildPage({
  params,
}: {
  params: { championId: string };
}) {
  const championId = Number(params.championId);

  let build: Awaited<ReturnType<typeof api.getChampionBuild>> | null = null;
  let error: string | null = null;
  try {
    build = await api.getChampionBuild(championId);
  } catch (e) {
    error = e instanceof Error ? e.message : "빌드 정보를 불러오지 못했습니다.";
  }

  if (error || !build) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-accent-loss/40 bg-base-surface p-6 text-center">
        <p className="text-base font-semibold text-accent-loss">아직 데이터가 없어요</p>
        <p className="mt-2 text-sm text-text-muted">
          {error ?? "이 챔피언에 대한 매치 데이터가 아직 pog.kr에 쌓이지 않았습니다."}
        </p>
        <a href="/tier-list" className="mt-4 inline-block text-sm text-accent-gold hover:underline">
          챔피언 티어로 돌아가기
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={build.champion_icon_url}
          alt={build.champion_name}
          className="h-16 w-16 rounded-md bg-base-elevated object-cover"
        />
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">{build.champion_name}</h1>
          <p className="text-sm text-text-faint">
            pog.kr 수집 매치 {build.games}경기 기준 · 승률 {build.win_rate.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 추천 스펠 + 룬 */}
        <div className="rounded-card border border-base-border bg-base-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">추천 스펠</h2>
          <div className="mb-5 flex gap-2">
            {build.spell_icon_urls.map((url, i) => (
              <div key={i} className="h-11 w-11 overflow-hidden rounded-md bg-base-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {url && <img src={url} alt="" className="h-full w-full object-cover" />}
              </div>
            ))}
          </div>

          <h2 className="mb-3 text-sm font-semibold text-text-muted">추천 룬</h2>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={build.primary_style_icon_url ?? undefined}
                  alt="주 룬트리"
                  className="h-4 w-4 object-contain"
                />
                <span className="text-[10px] text-text-faint">주 룬트리</span>
              </div>
              <div className="flex gap-2">
                <div className="h-11 w-11 overflow-hidden rounded-full border border-accent-gold/60 bg-base-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {build.keystone_icon_url && (
                    <img src={build.keystone_icon_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                {build.primary_minor_rune_icon_urls.map((url, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 self-end overflow-hidden rounded-full border border-base-border bg-base-elevated"
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
                  src={build.sub_style_icon_url ?? undefined}
                  alt="보조 룬트리"
                  className="h-4 w-4 object-contain"
                />
                <span className="text-[10px] text-text-faint">보조 룬트리</span>
              </div>
              <div className="flex gap-2">
                {build.secondary_rune_icon_urls.map((url, i) => (
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
        </div>

        {/* 추천 아이템 + 스킬 순서 */}
        <div className="rounded-card border border-base-border bg-base-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">추천 아이템</h2>
          <div className="mb-5 flex flex-wrap gap-2">
            {build.core_item_icon_urls.map((url, i) => (
              <div
                key={`core-${i}`}
                className="h-11 w-11 overflow-hidden rounded border border-base-border bg-base-elevated"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {url && <img src={url} alt="" className="h-full w-full object-cover" />}
              </div>
            ))}
            {build.boots_icon_url && (
              <div className="h-11 w-11 overflow-hidden rounded border border-blue-400/40 bg-base-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={build.boots_icon_url} alt="신발" className="h-full w-full object-cover" />
              </div>
            )}
            {build.trinket_icon_url && (
              <div className="h-11 w-11 overflow-hidden rounded border border-accent-gold/40 bg-base-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={build.trinket_icon_url} alt="장신구" className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          <h2 className="mb-3 text-sm font-semibold text-text-muted">스킬 우선순위</h2>
          {build.skill_priority.length > 0 ? (
            <div className="flex items-center gap-2">
              {build.skill_priority.map((skill, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-base-border bg-base-elevated font-display font-bold text-accent-gold">
                    {skill}
                  </div>
                  {i < build.skill_priority.length - 1 && (
                    <span className="text-text-faint">&gt;</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">데이터가 부족합니다.</p>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-text-faint">
        * pog.kr에서 검색된 소환사들의 매치를 다수결로 집계한 추천 빌드입니다. 표본이 적을수록
        신뢰도가 낮을 수 있어요.
      </p>
    </div>
  );
}
