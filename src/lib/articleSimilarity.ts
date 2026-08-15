export const SIMILARITY_THRESHOLD = 0.35;
export const TITLE_SIMILARITY_THRESHOLD = 0.28;

export type ArticleLike = {
  title: string;
  summaryAi?: string | null;
  summaryRaw?: string | null;
};

function normalizeTextForSimilarity(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function articleComparisonText(article: ArticleLike): string {
  const summary = (article.summaryAi ?? article.summaryRaw ?? "").slice(0, 200);
  return normalizeTextForSimilarity(`${article.title} ${summary}`);
}

function getNgrams(text: string, n: number): Set<string> {
  const bigrams = new Set<string>();
  const compact = text.replace(/\s+/g, "");
  for (let i = 0; i <= compact.length - n; i++) {
    bigrams.add(compact.slice(i, i + n));
  }
  return bigrams;
}

function setIntersectionSize(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection += 1;
  }
  return intersection;
}

function ngramJaccard(a: string, b: string, n: number): number {
  const ngramsA = getNgrams(a, n);
  const ngramsB = getNgrams(b, n);
  if (ngramsA.size === 0 || ngramsB.size === 0) return 0;

  const intersection = setIntersectionSize(ngramsA, ngramsB);
  const union = new Set([...ngramsA, ...ngramsB]).size;
  return union === 0 ? 0 : intersection / union;
}

function ngramOverlapCoefficient(a: string, b: string, n: number): number {
  const ngramsA = getNgrams(a, n);
  const ngramsB = getNgrams(b, n);
  if (ngramsA.size === 0 || ngramsB.size === 0) return 0;

  const intersection = setIntersectionSize(ngramsA, ngramsB);
  return intersection / Math.min(ngramsA.size, ngramsB.size);
}

export function titleSimilarity(a: string, b: string): number {
  const normA = normalizeTextForSimilarity(a);
  const normB = normalizeTextForSimilarity(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  let max = 0;
  for (const n of [2, 3, 4]) {
    max = Math.max(max, ngramJaccard(normA, normB, n), ngramOverlapCoefficient(normA, normB, n));
  }
  return max;
}

export function textSimilarity(a: string, b: string): number {
  const normA = normalizeTextForSimilarity(a);
  const normB = normalizeTextForSimilarity(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  let max = 0;
  for (const n of [2, 3]) {
    max = Math.max(max, ngramJaccard(normA, normB, n), ngramOverlapCoefficient(normA, normB, n));
  }
  return max;
}

export function articlesAreSimilar(
  a: ArticleLike,
  b: ArticleLike,
  threshold = SIMILARITY_THRESHOLD,
): boolean {
  const titleScore = titleSimilarity(a.title, b.title);
  if (titleScore >= TITLE_SIMILARITY_THRESHOLD) return true;

  const textA = articleComparisonText(a);
  const textB = articleComparisonText(b);
  return textSimilarity(textA, textB) >= threshold;
}

export function pickDiverseArticles<T extends ArticleLike>(
  ranked: T[],
  n: number,
  threshold = SIMILARITY_THRESHOLD,
  logPrefix?: string,
): T[] {
  const chosen: T[] = [];
  for (const article of ranked) {
    if (chosen.length >= n) break;
    const similarToChosen = chosen.some((picked) => articlesAreSimilar(picked, article, threshold));
    if (similarToChosen) {
      if (logPrefix) {
        console.log(`${logPrefix} dedup skipped=${article.title}`);
      }
      continue;
    }
    chosen.push(article);
  }
  return chosen;
}
