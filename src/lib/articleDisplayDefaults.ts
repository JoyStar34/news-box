/** User-facing copy when DB fields are missing on the homepage list. */
export const DISPLAY_SUMMARY_FALLBACK = "源站暂未提供摘要，建议查看原文。";

/** Unified persisted + UI fallback for why-it-matters text. */
export const PERSISTED_WHY_FALLBACK = "暂无解读";
export const DISPLAY_WHY_FALLBACK = PERSISTED_WHY_FALLBACK;

/** Any write path: trim; empty / whitespace becomes the persisted fallback. */
export function ensureWhyImportant(value: string | null | undefined): string {
  const t = value?.trim();
  return t || PERSISTED_WHY_FALLBACK;
}

/** Backward-compatible helper for old callers. */
export function defaultWhyImportantFromSummaryRaw(_summaryRaw?: string | null | undefined): string {
  void _summaryRaw;
  return PERSISTED_WHY_FALLBACK;
}

/** When AI summarization fails or is skipped: best-effort summary text to store. */
export function fallbackSummaryAiText(summaryRaw: string | null | undefined): string {
  const t = summaryRaw?.trim();
  return t || DISPLAY_SUMMARY_FALLBACK;
}
