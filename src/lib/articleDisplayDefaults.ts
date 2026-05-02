/** User-facing copy when DB fields are missing (homepage list). */
export const DISPLAY_SUMMARY_FALLBACK = "源站未提供摘要，建议查看原文。";
export const DISPLAY_WHY_FALLBACK = "该信息仍在分析中，建议关注后续更新。";

/** Persisted default when RSS had snippet vs not (stable “为什么重要” before AI). */
export function defaultWhyImportantFromSummaryRaw(summaryRaw: string | null | undefined): string {
  const has = Boolean(summaryRaw?.trim());
  return has
    ? "该进展可能影响相关技术与研究方向，建议关注后续验证。"
    : "关键信息有限，建议查看原文以判断影响。";
}

/** When AI summarization fails or is skipped: best-effort summary text to store. */
export function fallbackSummaryAiText(summaryRaw: string | null | undefined): string {
  const t = summaryRaw?.trim();
  return t || DISPLAY_SUMMARY_FALLBACK;
}
