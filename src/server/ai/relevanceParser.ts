export function parseRelevance(text: string): boolean | null {
  const tokens: string[] = text.toUpperCase().match(/[A-Z]+/g) ?? [];
  const relevantIndex = tokens.indexOf("RELEVANT");

  if (tokens.includes("IRRELEVANT")) return false;
  if (relevantIndex >= 0) {
    const previousTokens = tokens.slice(Math.max(0, relevantIndex - 2), relevantIndex);
    return previousTokens.includes("NOT") ? false : true;
  }
  return null;
}
