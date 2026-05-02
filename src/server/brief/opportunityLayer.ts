import type OpenAI from "openai";
import { z } from "zod";
import type { Article, Source } from "@prisma/client";
import { logOpenAiLatency, logOpenAiUsage } from "@/lib/openaiObservability";

export type ArticleOpportunityFields = {
  opportunityScore?: number;
  opportunitySummary?: string;
  actionIdeas?: string[];
};

const OP_START = "[[OPPORTUNITY_JSON]]";
const OP_END = "[[/OPPORTUNITY_JSON]]";

const oneArticleSchema = z.object({
  opportunityScore: z.number(),
  opportunitySummary: z.string(),
  actionIdeas: z.array(z.string()),
});

const bundleSchema = z.object({
  byArticleId: z.record(z.string(), oneArticleSchema),
});

export function stripOpportunityFromBody(body: string): string {
  const i = body.indexOf(OP_START);
  if (i === -1) return body.trimEnd();
  return body.slice(0, i).trimEnd();
}

export function parseOpportunityFromBody(body: string | null | undefined): Record<string, ArticleOpportunityFields> {
  if (!body) return {};
  const i = body.indexOf(OP_START);
  const j = body.indexOf(OP_END);
  if (i === -1 || j === -1 || j <= i) return {};
  const jsonStr = body.slice(i + OP_START.length, j).trim();
  try {
    const raw = JSON.parse(jsonStr) as unknown;
    const parsed = bundleSchema.safeParse(raw);
    if (!parsed.success) return {};
    const out: Record<string, ArticleOpportunityFields> = {};
    for (const [id, val] of Object.entries(parsed.data.byArticleId)) {
      const score = Math.round(Math.min(5, Math.max(1, val.opportunityScore)));
      const ideas = val.actionIdeas.slice(0, 3).filter(Boolean);
      out[id] = {
        opportunityScore: score,
        opportunitySummary: val.opportunitySummary.trim(),
        actionIdeas: ideas,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function appendOpportunityJson(
  body: string,
  byArticleId: Record<string, ArticleOpportunityFields>,
): string {
  const base = stripOpportunityFromBody(body);
  const payload = JSON.stringify({ v: 1, byArticleId });
  return `${base.trimEnd()}\n\n${OP_START}\n${payload}\n${OP_END}`;
}

export function mergeOpportunityIntoArticles<T extends { id: string }>(
  items: T[],
  briefBody: string | null | undefined,
): (T & ArticleOpportunityFields)[] {
  const map = parseOpportunityFromBody(briefBody ?? undefined);
  return items.map((item) => ({
    ...item,
    ...(map[item.id] ?? {}),
  }));
}

function extractJsonValue(text: string): unknown {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* continue */
    }
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(t.slice(start, end + 1));
    } catch {
      /* continue */
    }
  }
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

type ArticleForOpp = Article & {
  source: Source;
};

/**
 * One batched LLM call for the daily Top3 — persisted as JSON inside DailyBrief.body (no schema change).
 */
export async function generateOpportunityLayerForTopArticles(
  openai: OpenAI,
  model: string,
  articles: ArticleForOpp[],
): Promise<Record<string, ArticleOpportunityFields>> {
  if (articles.length === 0) return {};

  const lines = articles
    .map((a, idx) => {
      const sum = (a.summaryAi?.trim() || a.summaryRaw?.trim() || "").slice(0, 800);
      return [
        `### ${idx + 1}`,
        `articleId: ${a.id}`,
        `title: ${a.title}`,
        `source: ${a.source.name}`,
        sum ? `summary: ${sum}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const prompt = `基于下列 AI/科技/科学新闻，为每条判断独立开发者、内容创作者是否有可把握的机会，并给出可执行建议。

对每条新闻，请判断：
1. 是否对个人开发者/内容创作者有机会
2. 有哪些可以在 1 周内执行的小项目
3. 输出 1-3 条具体 action ideas（中文，具体可执行）

只输出一个 JSON 对象，不要 markdown 代码块以外的说明文字。结构必须严格为：
{
  "byArticleId": {
    "<文章 articleId>": {
      "opportunityScore": <1-5 的整数，5 表示机会最大>,
      "opportunitySummary": "<一句中文，概括机会类型或时间窗口>",
      "actionIdeas": ["<想法1>", "<想法2>"]
    }
  }
}

必须包含下列每一个 articleId 的键：${articles.map((a) => a.id).join(", ")}

新闻条目：
${lines}`;

  const start = Date.now();
  const completion = await openai.responses.create({
    model,
    temperature: 0.25,
    input: prompt,
  });
  logOpenAiLatency("[OPPORTUNITY_LAYER]", start);
  logOpenAiUsage(completion);

  const raw = (completion.output_text ?? "").trim();
  const extracted = extractJsonValue(raw);
  const parsed = bundleSchema.safeParse(extracted);
  if (!parsed.success) {
    console.warn("[OPPORTUNITY_LAYER] parse failed", parsed.error.flatten());
    return {};
  }

  const out: Record<string, ArticleOpportunityFields> = {};
  for (const a of articles) {
    const val = parsed.data.byArticleId[a.id];
    if (!val) continue;
    const score = Math.round(Math.min(5, Math.max(1, val.opportunityScore)));
    const ideas = val.actionIdeas.slice(0, 3).filter(Boolean);
    if (ideas.length === 0 || !val.opportunitySummary.trim()) continue;
    out[a.id] = {
      opportunityScore: score,
      opportunitySummary: val.opportunitySummary.trim(),
      actionIdeas: ideas,
    };
  }
  return out;
}
