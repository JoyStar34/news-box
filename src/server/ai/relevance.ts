export function parseRelevance(text: string): boolean | null {
  const upper = text.toUpperCase();
  const tokens = upper.match(/[A-Z]+/g) ?? [];

  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i] !== "RELEVANT") continue;
    return tokens[i - 1] === "NOT" ? false : true;
  }

  return null;
}
