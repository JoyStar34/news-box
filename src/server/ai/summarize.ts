import OpenAI from "openai";
import pLimit from "p-limit";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  PERSISTED_WHY_FALLBACK,
  ensureWhyImportant,
  fallbackSummaryAiText,
} from "@/lib/articleDisplayDefaults";
import { normalizeOptionalDbText } from "@/lib/dbText";
import { prisma } from "@/lib/prisma";
import { logOpenAiLatency, logOpenAiUsage } from "@/lib/openaiObservability";
import { getEnv } from "@/server/config/env";

const partialResultSchema = z.object({
  summaryAi: z.string().min(1).optional(),
  whyImportant: z.string().min(1).optional(),
});

function ensureSummaryAi(
  article: { summaryRaw: string | null; summaryAi: string | null },
  parsed?: string,
): string {
  const fromParsed = parsed?.trim();
  const fromDb = article.summaryAi?.trim();
  const fromRaw = fallbackSummaryAiText(article.summaryRaw);
  return (fromParsed || fromDb || fromRaw).trim() || fromRaw;
}

function mergeSummarizeFields(
  article: { summaryRaw: string | null; summaryAi: string | null; whyImportant: string | null },
  parsed: { summaryAi?: string; whyImportant?: string },
): { summaryAi: string; whyImportant: string } {
  return {
    summaryAi: ensureSummaryAi(article, parsed.summaryAi),
    whyImportant: ensureWhyImportant(parsed.whyImportant ?? article.whyImportant),
  };
}

/**
 * 优先级（高→低）：whyImportant 缺失 → fetchedAt 新 → score 高。
 * PostgreSQL 单纯 `whyImportant asc` 会把 NULL 排在末尾，故用 CASE + raw SQL 排序 id。
 */
async function fetchPendingArticlesOrdered(maxItems: number) {
  const idRows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id FROM "Article"
      WHERE (
          "summaryAi" IS NULL OR TRIM(BOTH FROM COALESCE("summaryAi", '')) = ''
          OR "whyImportant" IS NULL OR TRIM(BOTH FROM COALESCE("whyImportant", '')) = ''
        )
      ORDER BY
        CASE
          WHEN "whyImportant" IS NULL OR TRIM(BOTH FROM COALESCE("whyImportant", '')) = '' THEN 0
          ELSE 1
        END ASC,
        "fetchedAt" DESC,
        "score" DESC
      LIMIT ${maxItems}
    `,
  );

  const ids = idRows.map((r) => r.id);
  if (ids.length === 0) {
    return [];
  }

  const articles = await prisma.article.findMany({
    where: { id: { in: ids } },
    include: { source: true },
  });

  const rank = new Map(ids.map((id, index) => [id, index]));
  articles.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

  return articles;
}

function whyMissing(a: { whyImportant: string | null }): boolean {
  return normalizeOptionalDbText(a.whyImportant) === null;
}

function logPendingBatchMeta(pending: Awaited<ReturnType<typeof fetchPendingArticlesOrdered>>) {
  const n = pending.length;
  const firstFetchedAt = pending[0]?.fetchedAt ?? null;
  const hasWhyGap = pending.some(whyMissing);
  console.log(
    `[SUMMARIZE] batch size=${n} firstFetchedAt=${firstFetchedAt?.toISOString() ?? "n/a"} hasWhyImportantGap=${hasWhyGap}`,
  );
}

export async function summarizePendingArticles(maxItems = 100) {
  const env = getEnv();

  const pending = await fetchPendingArticlesOrdered(maxItems);

  console.log(`[SUMMARIZE] queued=${pending.length}`);
  logPendingBatchMeta(pending);

  const writeFallbacks = async (article: {
    id: string;
    summaryRaw: string | null;
    summaryAi: string | null;
    whyImportant: string | null;
  }) => {
    const summaryAi =
      normalizeOptionalDbText(ensureSummaryAi(article, undefined)) ?? fallbackSummaryAiText(article.summaryRaw);
    const whyImportant =
      normalizeOptionalDbText(ensureWhyImportant(article.whyImportant)) ?? PERSISTED_WHY_FALLBACK;

    await prisma.article.update({
      where: { id: article.id },
      data: {
        summaryAi,
        whyImportant,
      },
    });
  };

  if (!env.OPENAI_API_KEY) {
    console.log(`[SUMMARIZE] OPENAI_API_KEY not configured — applying fallbacks`);
    let n = 0;
    for (const article of pending) {
      await writeFallbacks(article);
      n += 1;
    }
    return { processed: n, skipped: 0, reason: "OPENAI_API_KEY not configured (fallbacks applied)" };
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });

  const limit = pLimit(3);

  const outcomes = await Promise.all(
    pending.map((article) =>
      limit(async () => {
        const prompt = [
          "You are an editor for a science and tech news app.",
          "Return JSON only with keys: summaryAi, whyImportant.",
          "summaryAi must be exactly 3 Chinese sentences.",
          "whyImportant must be exactly 1 Chinese sentence.",
          "",
          `Title: ${article.title}`,
          `Source: ${article.source.name}`,
          `Category: ${article.category}`,
          `Summary: ${article.summaryRaw ?? "N/A"}`,
        ].join("\n");

        let completion;
        try {
          const start = Date.now();
          completion = await openai.responses.create({
            model: env.OPENAI_MODEL,
            temperature: 0.2,
            input: prompt,
          });
          logOpenAiLatency("[SUMMARIZE]", start);
          logOpenAiUsage(completion);
        } catch (error) {
          console.error(`[ERROR][SUMMARIZE]`, error);
          await writeFallbacks(article);
          return "fail" as const;
        }

        const text = completion.output_text ?? "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          await writeFallbacks(article);
          return "fail" as const;
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(jsonMatch[0]);
        } catch {
          await writeFallbacks(article);
          return "fail" as const;
        }

        const partial = partialResultSchema.safeParse(parsedJson);
        if (!partial.success) {
          await writeFallbacks(article);
          return "fail" as const;
        }

        const merged = mergeSummarizeFields(article, partial.data);

        const summaryAi =
          normalizeOptionalDbText(merged.summaryAi) ?? fallbackSummaryAiText(article.summaryRaw);
        const whyImportant =
          normalizeOptionalDbText(merged.whyImportant) ?? PERSISTED_WHY_FALLBACK;

        await prisma.article.update({
          where: { id: article.id },
          data: {
            summaryAi,
            whyImportant,
          },
        });

        return "success" as const;
      }),
    ),
  );

  const success = outcomes.filter((o) => o === "success").length;
  const fail = outcomes.filter((o) => o === "fail").length;

  console.log(`[SUMMARIZE] success=${success} fail=${fail} (fail rows used fallbacks)`);

  return { processed: success + fail, skipped: pending.length - (success + fail) };
}
