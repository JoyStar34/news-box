/** User-facing copy when DB fields are missing (homepage list). */
export const DISPLAY_SUMMARY_FALLBACK = "源站未提供摘要，建议查看原文。";

/** Unified persisted + UI fallback for “为什么重要”（数据库与展示一致，避免误导）。 */
export const PERSISTED_WHY_FALLBACK = "暂无解读";
export const DISPLAY_WHY_FALLBACK = PERSISTED_WHY_FALLBACK;

/** Any write path: trim; empty / whitespace → persisted fallback. */
export function ensureWhyImportant(value: string | null | undefined): string {
  const t = value?.trim();
  return t || PERSISTED_WHY_FALLBACK;
}

/** 兼容旧调用；语义与 `PERSISTED_WHY_FALLBACK` 相同。 */
export function defaultWhyImportantFromSummaryRaw(_summaryRaw?: string | null | undefined): string {
  return PERSISTED_WHY_FALLBACK;
}

/** When AI summarization fails or is skipped: best-effort summary text to store. */
export function fallbackSummaryAiText(summaryRaw: string | null | undefined): string {
  const t = summaryRaw?.trim();
  return t || DISPLAY_SUMMARY_FALLBACK;
}
