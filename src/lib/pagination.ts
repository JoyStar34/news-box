export function parsePositiveInt(value: string | null | undefined, fallback: number, max?: number): number {
  const parsed = Number(value ?? fallback);
  const safeValue = Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  return typeof max === "number" ? Math.min(max, safeValue) : safeValue;
}
