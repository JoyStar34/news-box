import OpenAI from "openai";
import pLimit from "p-limit";
import { prisma } from "@/lib/prisma";
import { logOpenAiLatency, logOpenAiUsage } from "@/lib/openaiObservability";
import { getEnv } from "@/server/config/env";
import { computeFinalScore, computeFreshnessScore } from "@/server/scoring/freshness";

const BATCH_LIMIT = 30;
const CONCURRENCY = 3;

/** Articles that have not yet been classified by the relevance model */
function relevancePrompt(title: string, summary: string | null, sourceName: string) {
  return `You are filtering news relevance.

Determine if the article is relevant to:
- artificial intelligence
- machine learning
- scientific discoveries
- space exploration
- major technology innovation
- new research papers

NOT relevant:
- product deals
- shopping
- entertainment
- TV shows
- gaming
- gadget reviews
- lifestyle
Exclude:
- consumer tech news (e.g. phone launches, consumer electronics hype without research breakthrough angle)

Title: ${title}
Source: ${sourceName}
Summary: ${summary ?? "N/A"}

Return exactly one line, either:
RELEVANT
or
NOT_RELEVANT`;
}

function importancePrompt(title: string, summary: string | null, sourceName: string) {
  return `You are ranking the importance of AI and science news.

Score this article from 0–100 based on:

Impact: Is this a major breakthrough or industry shift?
Novelty: Is something new being introduced?
Scale: How many people or companies are affected?

90-100: Major AI model release, NASA discovery, groundbreaking research.
70-89: Important company announcements or notable research.
40-69: Minor updates.
0-39: Low impact.

Title: ${title}
Source: ${sourceName}
Summary: ${summary ?? "N/A"}

Return only a single integer from 0 to 100, nothing else.`;
}

async function callText(openai: OpenAI, model: string, input: string): Promise<string> {
  const start = Date.now();
  const completion = await openai.responses.create({
    model,
    temperature: 0.1,
    input,
  });
  logOpenAiLatency("[SCORE]", start);
  logOpenAiUsage(completion);
  return (completion.output_text ?? "").trim();
}

export function parseRelevance(text: string): boolean | null {
  const upper = text.toUpperCase();
  if (/\b(?:NOT[\s_-]*RELEVANT|IRRELEVANT|NON[\s_-]*RELEVANT|UNRELATED|OFF[\s_-]*TOPIC)\b/.test(upper)) {
    return false;
  }
  if (/\bRELEVANT\b/.test(upper)) return true;
  return null;
}

function parseImportance(text: string): number | null {
  const m = text.match(/\b(\d{1,3})\b/);
  if (!m) return null;
  const n = Number(m[1]);
  if (Number.isNaN(n) || n < 0 || n > 100) return null;
  return n;
}

/**
 * Run AI relevance → importance → final_score for articles with isRelevant = null.
 * Keeps legacy `score` in sync with `finalScore` for list sorting.
 */
export async function scorePendingArticles(maxItems: number = BATCH_LIMIT) {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    console.log(`[SCORE] OPENAI_API_KEY not configured`);
    return { processed: 0, skipped: 0, reason: "OPENAI_API_KEY not configured" as const };
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
  const model = env.OPENAI_MODEL;

  const pending = await prisma.article.findMany({
    where: { isRelevant: null },
    include: { source: true },
    orderBy: { fetchedAt: "desc" },
    take: maxItems,
  });

  const limit = pLimit(CONCURRENCY);

  type ScoreOutcome =
    | { kind: "irrelevant" }
    | { kind: "scored"; importance: number; finalScore: number }
    | { kind: "error" };

  const outcomes = await Promise.all(
    pending.map((article) =>
      limit(async () => {
        try {
          const relText = await callText(
            openai,
            model,
            relevancePrompt(article.title, article.summaryRaw, article.source.name),
          );
          const relevant = parseRelevance(relText);

          if (relevant === null) {
            console.warn(`[SCORE] unable to parse relevance response; leaving article pending`, {
              articleId: article.id,
            });
            return { kind: "error" } satisfies ScoreOutcome;
          }

          if (!relevant) {
            await prisma.article.update({
              where: { id: article.id },
              data: {
                relevanceScore: 0,
                isRelevant: false,
                importanceScore: null,
                finalScore: null,
                score: 0,
              },
            });
            return { kind: "irrelevant" } satisfies ScoreOutcome;
          }

          const impText = await callText(
            openai,
            model,
            importancePrompt(article.title, article.summaryRaw, article.source.name),
          );
          const importance = parseImportance(impText);
          if (importance === null) {
            console.warn(`[SCORE] unable to parse importance response; leaving article pending`, {
              articleId: article.id,
            });
            return { kind: "error" } satisfies ScoreOutcome;
          }

          const ref = article.publishedAt ?? article.fetchedAt;
          const freshness = computeFreshnessScore(ref);
          const w = article.source.weight;
          const final = computeFinalScore(importance, w, freshness);

          await prisma.article.update({
            where: { id: article.id },
            data: {
              relevanceScore: 100,
              isRelevant: true,
              importanceScore: importance,
              finalScore: final,
              score: final,
            },
          });
          return { kind: "scored", importance, finalScore: final } satisfies ScoreOutcome;
        } catch (err) {
          console.error(`[ERROR][SCORE]`, err);
          // Skip batch item on LLM/network failure; next cron retries null rows
          return { kind: "error" } satisfies ScoreOutcome;
        }
      }),
    ),
  );

  const irrelevant = outcomes.filter((o) => o.kind === "irrelevant").length;
  const scored = outcomes.filter((o) => o.kind === "scored").length;
  const processed = outcomes.filter((o) => o.kind !== "error").length;

  console.log(`[SCORE] evaluating articles=${pending.length}`);
  console.log(`[SCORE] relevant=${scored} irrelevant=${irrelevant}`);
  console.log(`[SCORE] scored=${scored}`);

  const scoredRows = outcomes.filter((o): o is Extract<ScoreOutcome, { kind: "scored" }> => o.kind === "scored");
  if (scoredRows.length > 0) {
    const importanceAvg =
      scoredRows.reduce((sum, o) => sum + o.importance, 0) / scoredRows.length;
    const finalScoreMax = Math.max(...scoredRows.map((o) => o.finalScore));
    console.log("[SCORE]", "importance_avg=", importanceAvg, "finalScore_max=", finalScoreMax);
  } else {
    console.log("[SCORE]", "importance_avg=", "n/a", "finalScore_max=", "n/a");
  }

  return { processed, skipped: pending.length - processed };
}
