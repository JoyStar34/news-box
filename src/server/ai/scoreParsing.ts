export function parseRelevance(text: string): boolean | null {
  const words: string[] = text.toUpperCase().match(/[A-Z]+/g) ?? [];

  if (words.includes("IRRELEVANT")) return false;

  for (let index = 0; index < words.length; index += 1) {
    if (words[index] !== "RELEVANT") continue;
    if (words[index - 1] === "NOT" || words[index - 1] === "NON") return false;
    return true;
  }

  return null;
}

export function parseImportance(text: string): number | null {
  const matches = [...text.matchAll(/\b(\d{1,3})\b/g)];
  if (matches.length !== 1) return null;

  const n = Number(matches[0][1]);
  if (Number.isNaN(n) || n < 0 || n > 100) return null;
  return n;
}
