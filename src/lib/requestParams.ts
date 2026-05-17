export function parsePositiveIntegerParam(
  value: string | null,
  fallback: number,
  max?: number,
): number {
  const parsed = Number(value ?? fallback);
  const boundedFallback = Math.max(1, Math.floor(fallback));
  const integer = Number.isFinite(parsed) ? Math.floor(parsed) : boundedFallback;
  const positive = Math.max(1, integer);
  return typeof max === "number" ? Math.min(max, positive) : positive;
}
