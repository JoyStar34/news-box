export function parseRelevance(text: string): boolean | null {
  const normalized = text.trim();
  if (!normalized) return null;

  if (/\b(?:NOT[\s_-]*RELEVANT|IRRELEVANT)\b/i.test(normalized)) {
    return false;
  }

  if (/\bRELEVANT\b/i.test(normalized)) {
    return true;
  }

  return null;
}
