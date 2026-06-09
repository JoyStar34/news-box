type PositiveIntOptions = {
  defaultValue: number;
  max?: number;
};

export function parsePositiveIntParam(
  value: string | number | null | undefined,
  { defaultValue, max }: PositiveIntOptions,
): number {
  const parsed = typeof value === "number" ? value : Number(value ?? defaultValue);
  const normalized = Number.isFinite(parsed) ? Math.floor(parsed) : defaultValue;
  const positive = normalized >= 1 ? normalized : defaultValue;
  return typeof max === "number" ? Math.min(max, positive) : positive;
}
