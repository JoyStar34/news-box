export const SCORING_QUEUE_WHERE = {
  OR: [{ isRelevant: null }, { isRelevant: true, finalScore: null }],
} as const;

export function parseRelevance(text: string): boolean | null {
  const normalized = text
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^A-Z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return null;
  if (/\b(?:NOT\s+RELEVANT|IRRELEVANT)\b/.test(normalized)) return false;
  if (/\bRELEVANT\b/.test(normalized)) return true;
  return null;
}

export function parseImportance(text: string): number | null {
  const m = text.match(/\b(\d{1,3})\b/);
  if (!m) return null;
  const n = Number(m[1]);
  if (Number.isNaN(n) || n < 0 || n > 100) return null;
  return n;
}
