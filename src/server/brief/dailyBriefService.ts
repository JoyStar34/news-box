import { subHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { Article, Source } from "@prisma/client";
import {
  mergeOpportunityIntoArticles,
  stripOpportunityFromBody,
  type ArticleOpportunityFields,
} from "@/server/brief/opportunityLayer";

export type ArticleWithSource = Article & { source: Source };

/** Homepage Top 3 row: optional UX flags + opportunity layer (runtime only). */
export type TopBriefArticle = ArticleWithSource & {
  repeatFromYesterday?: boolean;
} & ArticleOpportunityFields;

function utcDayStart(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function utcYesterdayStart(from: Date = new Date()): Date {
  const t = utcDayStart(from);
  const y = new Date(t);
  y.setUTCDate(y.getUTCDate() - 1);
  return y;
}

/** Article IDs that appeared on yesterday's DailyBrief (UTC calendar day). */
export async function getYesterdayTopArticleIds(): Promise<Set<string>> {
  const brief = await prisma.dailyBrief.findUnique({
    where: { briefDate: utcYesterdayStart() },
    include: { items: { select: { articleId: true } } },
  });
  return new Set(brief?.items.map((i) => i.articleId) ?? []);
}

/** Raw DailyBrief.body for today (includes embedded opportunity JSON). */
export async function getTodayDailyBriefBody(): Promise<string | null> {
  const brief = await prisma.dailyBrief.findUnique({
    where: { briefDate: utcDayStart() },
    select: { body: true },
  });
  return brief?.body ?? null;
}

export function attachRepeatFromYesterday<T extends ArticleWithSource>(
  items: T[],
  yesterdayIds: Set<string>,
): (T & { repeatFromYesterday?: boolean })[] {
  return items.map((item) =>
    yesterdayIds.has(item.id) ? { ...item, repeatFromYesterday: true } : item,
  );
}

/** Fallback when DailyBrief not yet generated: recent high-ranked articles only */
export async function getFallbackTopArticles(): Promise<ArticleWithSource[]> {
  const since = subHours(new Date(), 24);
  return prisma.article.findMany({
    where: {
      isRelevant: true,
      finalScore: { not: null },
      fetchedAt: { gte: since },
    },
    orderBy: [{ finalScore: "desc" }, { fetchedAt: "desc" }],
    take: 3,
    include: { source: true },
  });
}

/**
 * Top 3 for homepage and /api/top: today's DailyBrief items, else recent ranked articles (24h).
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

  return getFallbackTopArticles();
}

export type DailyBriefResult = {
  title: string;
  text: string;
  items: TopBriefArticle[];
};

/**
 * Body text + top items for "Today in Science" panel.
 */
export async function buildDailyBriefFromStore(): Promise<DailyBriefResult> {
  const day = utcDayStart();
  const [brief, yesterdayIds] = await Promise.all([
    prisma.dailyBrief.findUnique({
      where: { briefDate: day },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: { article: { include: { source: true } } },
        },
      },
    }),
    getYesterdayTopArticleIds(),
  ]);

  const rawItems: ArticleWithSource[] =
    brief?.items.map((i) => ({ ...i.article, source: i.article.source })) ?? (await getDailyTopArticles());

  const items: TopBriefArticle[] = mergeOpportunityIntoArticles(
    attachRepeatFromYesterday(rawItems, yesterdayIds),
    brief?.body,
  );

  const emptyCopy = "当前暂无重要新闻，稍后更新";

  const rawBriefDisplay = brief?.body ? stripOpportunityFromBody(brief.body) : null;
  const text =
    rawBriefDisplay ??
    (items.length ? items.map((item, idx) => `${idx + 1}. ${item.title}`).join("\n") : emptyCopy);

  return {
    title: "Today in Science",
    text,
    items,
  };
}
