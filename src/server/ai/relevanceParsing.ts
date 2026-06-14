export function parseRelevance(text: string): boolean | null {
  const tokens = text.toUpperCase().match(/[A-Z]+/g) ?? [];
  if (tokens.length === 0) return null;

  if (
    tokens.some((token) => token === "IRRELEVANT") ||
    tokens.some((token, index) => token === "NOT" && tokens[index + 1] === "RELEVANT")
  ) {
    return false;
  }

  if (tokens.some((token) => token === "RELEVANT")) return true;
  return null;
}
