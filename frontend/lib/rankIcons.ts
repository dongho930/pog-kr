// 티어(랭크) 엠블럼 아이콘. Riot League-V4 API가 주는 tier 값
// ("IRON" ~ "CHALLENGER")을 그대로 소문자로 바꿔서 Community Dragon의
// 정적 에셋 경로에 매핑한다.
const VALID_TIERS = new Set([
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
]);

export function tierEmblemUrl(tier?: string | null): string | null {
  if (!tier) return null;
  const normalized = tier.toUpperCase();
  if (!VALID_TIERS.has(normalized)) return null;
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${normalized.toLowerCase()}.png`;
}
