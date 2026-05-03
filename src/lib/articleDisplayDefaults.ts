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

/** UI line for an article: AI summary → raw excerpt → title → placeholder (never blank). */
export function pickArticleSummaryDisplay(article: {
  title: string;
  summaryAi?: string | null;
  summaryRaw?: string | null;
}): string {
  const ai = article.summaryAi?.trim();
  if (ai) return ai;
  const raw = article.summaryRaw?.trim();
  if (raw) return raw;
  const t = article.title?.trim();
  if (t) return t;
  return DISPLAY_SUMMARY_FALLBACK;
}

/** Numbered block for Today in Science when driven by top articles (not persisted brief prose). */
export function formatNumberedTodayInScienceLines<
  T extends { title: string; summaryAi?: string | null; summaryRaw?: string | null },
>(items: T[]): string {
  if (items.length === 0) return "";
  return items.map((item, idx) => `${idx + 1}. ${pickArticleSummaryDisplay(item)}`).join("\n");
}

/** True when `text` is exactly the server’s title-list fallback for these items. */
export function isNumberedTitleOnlyBriefText(text: string, items: Array<{ title: string }>): boolean {
  if (items.length === 0) return false;
  const norm = (s: string) => s.replace(/\r\n/g, "\n").trim();
  const titleBlock = items.map((item, idx) => `${idx + 1}. ${item.title.trim()}`).join("\n");
  return norm(text) === norm(titleBlock);
}
