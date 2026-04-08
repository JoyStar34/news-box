type ScoreInput = {
  publishedAt: Date | null;
  fetchedAt: Date;
  sourcePriority: number;
};

export function calculateScore(input: ScoreInput): number {
  const now = Date.now();
  const baseTime = input.publishedAt ?? input.fetchedAt;
  const ageHours = Math.max(0, (now - baseTime.getTime()) / (1000 * 60 * 60));

  const freshnessWeight = Math.max(0, 10 - ageHours / 2);
  const sourceWeight = input.sourcePriority;

  return Number((freshnessWeight + sourceWeight).toFixed(3));
}

