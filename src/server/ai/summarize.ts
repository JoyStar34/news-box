import OpenAI from "openai";
import pLimit from "p-limit";
import { z } from "zod";
import {
  defaultWhyImportantFromSummaryRaw,
  fallbackSummaryAiText,
} from "@/lib/articleDisplayDefaults";
import { prisma } from "@/lib/prisma";
import { logOpenAiLatency, logOpenAiUsage } from "@/lib/openaiObservability";
import { getEnv } from "@/server/config/env";

const partialResultSchema = z.object({
  summaryAi: z.string().min(1).optional(),
  whyImportant: z.string().min(1).optional(),
});

function mergeSummarizeFields(
  article: { summaryRaw: string | null; summaryAi: string | null; whyImportant: string | null },
  parsed: { summaryAi?: string; whyImportant?: string },
): { summaryAi: string; whyImportant: string } {
  const summaryAi =
    (parsed.summaryAi?.trim() || article.summaryAi?.trim() || fallbackSummaryAiText(article.summaryRaw)).trim();
  const whyImportant =
    (parsed.whyImportant?.trim() ||
      article.whyImportant?.trim() ||
      defaultWhyImportantFromSummaryRaw(article.summaryRaw)).trim();
  return { summaryAi, whyImportant };
}

export async function summarizePendingArticles(maxItems = 30) {
  const env = getEnv();

  const pendingWhere = {
    AND: [
      { OR: [{ isRelevant: null }, { isRelevant: true }] },
      {
        OR: [
          { summaryAi: null },
          { whyImportant: null },
          { whyImportant: "" },
          { summaryAi: "" },
        ],
      },
    ],
  };

  const pending = await prisma.article.findMany({
    where: pendingWhere,
    include: { source: true },
    orderBy: { fetchedAt: "desc" },
    take: maxItems,
  });

  console.log(`[SUMMARIZE] queued=${pending.length}`);

  if (!env.OPENAI_API_KEY) {
    console.log(`[SUMMARIZE] OPENAI_API_KEY not configured — applying display fallbacks`);
    let n = 0;
    for (const article of pending) {
      await prisma.article.update({
        where: { id: article.id },
        data: {
          summaryAi: article.summaryAi?.trim() || fallbackSummaryAiText(article.summaryRaw),
          whyImportant: article.whyImportant?.trim() || defaultWhyImportantFromSummaryRaw(article.summaryRaw),
        },
      });
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

        const applyFallbacks = async () => {
          await prisma.article.update({
            where: { id: article.id },
            data: mergeSummarizeFields(article, {}),
          });
        };

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
          await applyFallbacks();
          return "fail" as const;
        }

        const text = completion.output_text ?? "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          await applyFallbacks();
          return "fail" as const;
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(jsonMatch[0]);
        } catch {
          await applyFallbacks();
          return "fail" as const;
        }

        const partial = partialResultSchema.safeParse(parsedJson);
        if (!partial.success) {
          await applyFallbacks();
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
