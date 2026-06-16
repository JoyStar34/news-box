import type { Prisma } from "@prisma/client";

export const SCORING_QUEUE_WHERE = {
  OR: [{ isRelevant: null }, { isRelevant: true, finalScore: null }],
} satisfies Prisma.ArticleWhereInput;

export function parseRelevance(text: string): boolean | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const exact = trimmed
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[.!]+$/g, "");
  if (exact === "RELEVANT") return true;
  if (exact === "NOT_RELEVANT" || exact === "IRRELEVANT") return false;

  const words = trimmed.toUpperCase().match(/[A-Z]+/g) ?? [];
  if (words.includes("IRRELEVANT") || words.includes("NOTRELEVANT")) {
    return false;
  }

  const relevantIndex = words.findIndex((word) => word === "RELEVANT");
  if (relevantIndex === -1) return null;

  const precedingWords = words.slice(Math.max(0, relevantIndex - 3), relevantIndex);
  if (precedingWords.includes("NOT") || precedingWords.includes("NON")) {
    return false;
  }

  return true;
}

export function parseImportance(text: string): number | null {
  const m = text.match(/\b(\d{1,3})\b/);
  if (!m) return null;
  const n = Number(m[1]);
  if (Number.isNaN(n) || n < 0 || n > 100) return null;
  return n;
}
