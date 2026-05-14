export function parseRelevance(text: string): boolean | null {
  const normalized = text.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (/\b(?:NOT_RELEVANT|IRRELEVANT)\b/.test(normalized)) return false;
  if (/\bRELEVANT\b/.test(normalized)) return true;
  return null;
}
