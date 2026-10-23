export const MAX_PAGE = 100_000;

/** Never pass NaN, Infinity, fractions, or unbounded user input into database pagination. */
export function positiveInteger(value: unknown, fallback: number, maximum = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) return fallback;
  return Math.min(number, maximum);
}
