import { prisma } from "@/lib/prisma";
import type { Article, Source } from "@prisma/client";

export type ArticleWithSource = Article & { source: Source };

function utcDayStart(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Fallback when DailyBrief not yet generated: best ranked relevant articles */
export async function getFallbackTopArticles(): Promise<ArticleWithSource[]> {
  return prisma.article.findMany({
    where: { isRelevant: true, finalScore: { not: null } },
    orderBy: [{ finalScore: "desc" }, { fetchedAt: "desc" }],
    take: 3,
    include: { source: true },
  });
}

/**
 * Top 3 for homepage and /api/top: today's DailyBrief items, else legacy score order.
 */
export async function getDailyTopArticles(): Promise<ArticleWithSource[]> {
  const day = utcDayStart();
  const brief = await prisma.dailyBrief.findUnique({
    where: { briefDate: day },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { article: { include: { source: true } } },
      },
    },
  });

  if (brief?.items.length) {
    return brief.items.map((i) => {
      const a = i.article;
      return { ...a, source: a.source };
    });
  }

  const ranked = await getFallbackTopArticles();
  if (ranked.length) return ranked;

  return prisma.article.findMany({
    orderBy: [{ score: "desc" }, { fetchedAt: "desc" }],
    take: 3,
    include: { source: true },
  });
}

export type DailyBriefResult = {
  title: string;
  text: string;
  items: ArticleWithSource[];
};

/**
 * Body text + top items for "Today in Science" panel.
 */
export async function buildDailyBriefFromStore(): Promise<DailyBriefResult> {
  const day = utcDayStart();
  const brief = await prisma.dailyBrief.findUnique({
    where: { briefDate: day },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { article: { include: { source: true } } },
      },
    },
  });

  const items: ArticleWithSource[] =
    brief?.items.map((i) => ({ ...i.article, source: i.article.source })) ?? (await getDailyTopArticles());

  const text =
    brief?.body ??
    (items.length
      ? items.map((item, idx) => `${idx + 1}. ${item.title}`).join("\n")
      : "暂无可用新闻数据，请先触发抓取与评分任务。");

  return {
    title: "Today in Science",
    text,
    items,
  };
}
