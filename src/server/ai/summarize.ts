import OpenAI from "openai";
import pLimit from "p-limit";
import { z } from "zod";
import { ensureWhyImportant, fallbackSummaryAiText } from "@/lib/articleDisplayDefaults";
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
 * 待处理：summaryAi 或 whyImportant 缺失（含空串）。不按 isRelevant 过滤。
 * 仅含 null/"" 的 DB 条件；全空白行依赖 backfill-why-important 或单次写入时的 ensureWhyImportant。
 */
function pendingWhereClause() {
  return {
    OR: [
      { summaryAi: null },
      { summaryAi: "" },
      { whyImportant: null },
      { whyImportant: "" },
    ],
  };
}

export async function summarizePendingArticles(maxItems = 100) {
  const env = getEnv();

  const pending = await prisma.article.findMany({
    where: pendingWhereClause(),
    include: { source: true },
    orderBy: { fetchedAt: "desc" },
    take: maxItems,
  });

  console.log(`[SUMMARIZE] queued=${pending.length}`);

  const writeFallbacks = async (article: {
    id: string;
    summaryRaw: string | null;
    summaryAi: string | null;
    whyImportant: string | null;
  }) => {
    await prisma.article.update({
      where: { id: article.id },
      data: {
        summaryAi: ensureSummaryAi(article, undefined),
        whyImportant: ensureWhyImportant(article.whyImportant),
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

        await prisma.article.update({
          where: { id: article.id },
          data: {
            summaryAi: merged.summaryAi,
            whyImportant: merged.whyImportant,
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
