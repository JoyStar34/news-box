import { prisma } from "@/lib/prisma";
import type { Article, Source } from "@prisma/client";
import {
  mergeOpportunityIntoArticles,
  parseOpportunityMetaFromBody,
  stripOpportunityFromBody,
  type ArticleOpportunityFields,
  type OpportunityMeta,
} from "@/server/brief/opportunityLayer";

export type ArticleWithSource = Article & { source: Source };
export type TopBriefArticle = ArticleWithSource & ArticleOpportunityFields;

function dayStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function getYesterdayTopArticleIds(): Promise<Set<string>> {
  return new Set();
}

export async function getTodayDailyBriefBody(): Promise<string | null> {
  const brief = await prisma.dailyBrief.findUnique({
    where: { briefDate: dayStart() },
    select: { body: true },
  });
  return brief?.body ?? null;
}

export function attachRepeatFromYesterday<T extends ArticleWithSource>(items: T[], _yesterdayIds?: Set<string>): T[] {
  void _yesterdayIds;
  return items;
}

export async function getFallbackTopArticles(): Promise<ArticleWithSource[]> {
  return [];
}

export async function getDailyTopArticles(): Promise<ArticleWithSource[]> {
  const brief = await prisma.dailyBrief.findUnique({
    where: { briefDate: dayStart() },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { article: { include: { source: true } } },
      },
    },
  });

  if (brief?.items.length) {
    return brief.items.map((i) => ({ ...i.article, source: i.article.source }));
  }

  return [];
}

export type DailyBriefResult = {
  title: string;
  text: string;
  items: TopBriefArticle[];
  meta: OpportunityMeta;
};

export async function buildDailyBriefFromStore(): Promise<DailyBriefResult> {
  const brief = await prisma.dailyBrief.findUnique({
    where: { briefDate: dayStart() },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { article: { include: { source: true } } },
      },
    },
  });

  const rawItems: ArticleWithSource[] = brief?.items.map((i) => ({ ...i.article, source: i.article.source })) ?? [];
  const items = mergeOpportunityIntoArticles(rawItems, brief?.body)
    .filter((item) => item.opportunityScore != null && Boolean(item.actionIdea?.trim()))
    .slice(0, 3);
  const text = brief?.body
    ? stripOpportunityFromBody(brief.body)
    : items.length
      ? items.map((item, idx) => `${idx + 1}. ${item.title}`).join("\n")
      : "今天还没有可展示的机会。";

  return {
    title: "今日 AI 机会 Top 3",
    text,
    items,
    meta: parseOpportunityMetaFromBody(brief?.body),
  };
}
