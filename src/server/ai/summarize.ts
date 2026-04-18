import OpenAI from "openai";
import pLimit from "p-limit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/server/config/env";

const resultSchema = z.object({
  summaryAi: z.string().min(1),
  whyImportant: z.string().min(1),
});

export async function summarizePendingArticles(maxItems = 30) {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    console.log(`[SUMMARIZE] OPENAI_API_KEY not configured`);
    return { processed: 0, skipped: maxItems, reason: "OPENAI_API_KEY not configured" };
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });

  // Exclude isRelevant === false only; null (legacy / not yet scored) still gets summaries
  const pending = await prisma.article.findMany({
    where: {
      summaryAi: null,
      OR: [{ isRelevant: null }, { isRelevant: true }],
    },
    include: { source: true },
    orderBy: { fetchedAt: "desc" },
    take: maxItems,
  });

  console.log(`[SUMMARIZE] queued=${pending.length}`);

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
          completion = await openai.responses.create({
            model: env.OPENAI_MODEL,
            temperature: 0.2,
            input: prompt,
          });
        } catch (error) {
          console.error(`[ERROR][SUMMARIZE]`, error);
          return "fail" as const;
        }

        const text = completion.output_text ?? "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return "fail" as const;

        let parsed;
        try {
          parsed = resultSchema.safeParse(JSON.parse(jsonMatch[0]));
        } catch {
          return "fail" as const;
        }
        if (!parsed.success) return "fail" as const;

        await prisma.article.update({
          where: { id: article.id },
          data: {
            summaryAi: parsed.data.summaryAi,
            whyImportant: parsed.data.whyImportant,
          },
        });

        return "success" as const;
      }),
    ),
  );

  const success = outcomes.filter((o) => o === "success").length;
  const fail = outcomes.filter((o) => o === "fail").length;

  console.log(`[SUMMARIZE] success=${success} fail=${fail}`);

  return { processed: success, skipped: pending.length - success };
}
