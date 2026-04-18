/**
 * Freshness tier for AI News 2.0 final_score (0.1 weight).
 * Based on publishedAt ?? fetchedAt vs now.
 */
export function computeFreshnessScore(reference: Date, now: Date = new Date()): number {
  const ageHours = Math.max(0, (now.getTime() - reference.getTime()) / (1000 * 60 * 60));
  if (ageHours < 24) return 100;
  if (ageHours < 48) return 80;
  if (ageHours < 72) return 60;
  return 30;
}

/** final_score = 0.7 * importance + 0.2 * weight*100 + 0.1 * freshness */
export function computeFinalScore(importance: number, sourceWeight: number, freshness: number): number {
  const v = 0.7 * importance + 0.2 * sourceWeight * 100 + 0.1 * freshness;
  return Number(v.toFixed(4));
}
