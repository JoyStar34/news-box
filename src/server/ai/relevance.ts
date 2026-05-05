export function parseRelevance(text: string): boolean | null {
  const words = text.toUpperCase().match(/[A-Z]+/g) ?? [];

  if (words.some((word) => word === "IRRELEVANT" || word === "NOTRELEVANT" || word === "NONRELEVANT")) {
    return false;
  }

  const relevantIndex = words.findIndex((word) => word === "RELEVANT");
  if (relevantIndex === -1) {
    return null;
  }

  const negationWindowStart = Math.max(0, relevantIndex - 3);
  for (let i = negationWindowStart; i < relevantIndex; i += 1) {
    if (words[i] === "NOT" || words[i] === "NON") return false;
  }

  return true;
}
