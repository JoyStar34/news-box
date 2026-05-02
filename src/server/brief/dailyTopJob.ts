import OpenAI from "openai";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logOpenAiLatency, logOpenAiUsage } from "@/lib/openaiObservability";
import { appendOpportunityJson } from "@/server/brief/opportunityLayer";
import { getEnv } from "@/server/config/env";
import type { Article, Source } from "@prisma/client";

type ArticleWithSource = Article & { source: Source };

type ScoredOpportunity = {
  articleId: string;
  title: string;
  whyImportant: string;
  opportunityScore: number;
  actionIdea: string;
};

type ScoreResult = {
  top3: ScoredOpportunity[];
  promptHash: string;
};

const topOpportunitySchema = z.object({
  top3: z
    .array(
      z.object({
        articleId: z.string(),
        title: z.string(),
        whyImportant: z.string(),
        opportunityScore: z.number(),
        actionIdea: z.string(),
      }),
    )
    .length(3),
});

function dayStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function nextDayStart(d: Date = new Date()): Date {
  const next = dayStart(d);
  next.setDate(next.getDate() + 1);
  return next;
}

function extractJsonValue(text: string): unknown {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      return null;
    }
  }

  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(t.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function articleInput(a: ArticleWithSource, index: number): string {
  const summary = (a.summaryAi?.trim() || a.summaryRaw?.trim() || "").slice(0, 600);
  const why = (a.whyImportant?.trim() || "").slice(0, 280);
  return [
    `### ${index + 1}`,
    `articleId: ${a.id}`,
    `title: ${a.title}`,
    `source: ${a.source.name}`,
    `category: ${a.category}`,
    `publishedAt: ${(a.publishedAt ?? a.fetchedAt).toISOString()}`,
    summary ? `summary: ${summary}` : null,
    why ? `existingWhy: ${why}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeOpportunity(raw: ScoredOpportunity, article: ArticleWithSource): ScoredOpportunity {
  const why = raw.whyImportant.trim();
  return {
    articleId: article.id,
    title: article.title,
    whyImportant: why.includes("为什么现在重要") ? why : `为什么现在重要：${why}`,
    opportunityScore: Math.round(Math.min(100, Math.max(0, raw.opportunityScore))),
    actionIdea: raw.actionIdea.trim(),
  };
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 8);
}

function buildScoringPrompt(list: string): string {
  return `你是一个“独立开发者 + 投资人 + 内容创作者”的AI助手。

你的目标不是总结新闻，而是帮用户发现可以行动或获利的机会。

请对下面“当天抓取的所有新闻”逐条判断机会价值，评分范围 0-100。

评分只看：

1. 是否存在“可以做的事情”（写代码 / 投资 / 内容 / 产品）
2. 是否存在“时间窗口”（现在做 vs 以后做价值差很多）
3. 是否存在“杠杆”（一个人做是否能放大收益）
4. 是否有“明确触发信号”（政策 / 技术 / 产品发布 / 价格变化）

请先在内部完成每条新闻评分，然后只输出综合分最高的 Top 3。

输出必须是 JSON，不要 Markdown，不要解释。结构必须严格为：
{
  "top3": [
    {
      "articleId": "<必须来自输入>",
      "title": "<使用输入里的原始标题>",
      "whyImportant": "1-2句中文，必须包含“为什么现在重要”这几个字",
      "opportunityScore": 0-100,
      "actionIdea": "必须满足：
        - 具体到“可以在24小时内执行”
        - 必须包含动作动词（如：注册 / 测试 / 对比 / 投资 / 发布 / 监控）
        - 不能是“关注 / 了解 / 讨论”"
    }
  ]
}

当天新闻：
${list}`;
}

async function scoreTodayArticlesWithAi(openai: OpenAI, model: string, articles: ArticleWithSource[]): Promise<ScoreResult> {
  const list = articles.map(articleInput).join("\n\n");
  const prompt = buildScoringPrompt(list);
  const promptHash = hashText(buildScoringPrompt(""));

  const start = Date.now();
  const completion = await openai.responses.create({
    model,
    temperature: 0.2,
    input: prompt,
  });
  logOpenAiLatency("[DAILY_TOP]", start);
  logOpenAiUsage(completion);

  const parsed = topOpportunitySchema.safeParse(extractJsonValue(completion.output_text ?? ""));
  if (!parsed.success) {
    throw new Error(`AI top3 response did not match schema: ${JSON.stringify(parsed.error.flatten())}`);
  }

  const articleMap = new Map(articles.map((a) => [a.id, a]));
  const seen = new Set<string>();
  const top3: ScoredOpportunity[] = [];
  for (const item of parsed.data.top3) {
    const article = articleMap.get(item.articleId);
    if (!article || seen.has(article.id)) continue;
    const normalized = normalizeOpportunity(item, article);
    if (!normalized.actionIdea || !normalized.whyImportant) continue;
    seen.add(article.id);
    top3.push(normalized);
  }

  if (top3.length !== 3) {
    throw new Error(`AI returned ${top3.length} usable top articles, expected 3`);
  }

  return { top3, promptHash };
}

/**
 * PMF chain: get today's full article list -> AI scores each item -> persist Top 3 opportunities.
 */
export async function generateDailyTopNews(): Promise<{
  ok: boolean;
  briefDate: string;
  articleIds: string[];
  reason?: string;
  promptHash?: string;
}> {
  const env = getEnv();
  const day = dayStart();
  const nextDay = nextDayStart();

  if (!env.OPENAI_API_KEY) {
    return { ok: false, briefDate: day.toISOString(), articleIds: [], reason: "missing_openai_api_key" };
  }

  const articles = await prisma.article.findMany({
    where: {
      fetchedAt: {
        gte: day,
        lt: nextDay,
      },
    },
    orderBy: { fetchedAt: "desc" },
    include: { source: true },
  });

  console.log(`[DAILY_TOP] today_articles=${articles.length}`);

  if (articles.length < 3) {
    return { ok: false, briefDate: day.toISOString(), articleIds: [], reason: "not_enough_today_articles" };
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
  const { top3, promptHash } = await scoreTodayArticlesWithAi(openai, env.OPENAI_MODEL, articles);
  const articleMap = new Map(articles.map((a) => [a.id, a]));
  const chosen = top3.map((item) => articleMap.get(item.articleId)).filter((a): a is ArticleWithSource => Boolean(a));

  const bodyText = top3
    .map(
      (item, index) =>
        `${index + 1}. ${item.title}\n${item.whyImportant}\n行动建议：${item.actionIdea}\n机会分：${item.opportunityScore}/100`,
    )
    .join("\n\n");

  const body = appendOpportunityJson(
    bodyText,
    Object.fromEntries(
      top3.map((item) => [
        item.articleId,
        {
          whyImportant: item.whyImportant,
          opportunityScore: item.opportunityScore,
          actionIdea: item.actionIdea,
        },
      ]),
    ),
    {
      generatedAt: new Date().toISOString(),
      promptHash,
    },
  );

  await prisma.$transaction(async (tx) => {
    const brief = await tx.dailyBrief.upsert({
      where: { briefDate: day },
      create: { briefDate: day, body },
      update: { body },
    });

    await tx.dailyBriefItem.deleteMany({ where: { briefId: brief.id } });
    await tx.dailyBriefItem.createMany({
      data: chosen.map((article, idx) => ({
        briefId: brief.id,
        articleId: article.id,
        position: idx + 1,
      })),
    });

    for (const item of top3) {
      await tx.article.update({
        where: { id: item.articleId },
        data: { whyImportant: item.whyImportant },
      });
    }
  });

  console.log(`[DAILY_TOP] selected=[${top3.map((a) => a.articleId).join(",")}]`);

  return {
    ok: true,
    briefDate: day.toISOString(),
    articleIds: top3.map((a) => a.articleId),
    promptHash,
  };
}
