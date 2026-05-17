import { subHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { Article, Source } from "@prisma/client";

export type ArticleWithSource = Article & { source: Source };

/** Homepage Top 3 row: optional UX flags (API may omit). */
export type TopBriefArticle = ArticleWithSource & {
  repeatFromYesterday?: boolean;
};

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

export function attachRepeatFromYesterday<T extends ArticleWithSource>(
  items: T[],
  yesterdayIds: Set<string>,
): (T & { repeatFromYesterday?: boolean })[] {
  return items.map((item) =>
    yesterdayIds.has(item.id) ? { ...item, repeatFromYesterday: true } : item,
  );
}

function blurbFromArticle(item: ArticleWithSource): string {
  return (
    item.summaryAi?.trim() ||
    item.whyImportant?.trim() ||
    item.summaryRaw?.trim() ||
    item.title
  ).trim();
}

/** When there is no AI brief body yet, show readable blurbs instead of bare titles. */
export function buildFallbackBriefText(items: ArticleWithSource[]): string {
  return items.map((item, idx) => `${idx + 1}. ${blurbFromArticle(item)}`).join("\n\n");
}

/**
 * Turn a one-line Chinese/Latin brief (e.g. "句一。句二。句三。") into spaced paragraphs for `whitespace-pre-line`.
 * No-op if there are already blank-line breaks or fewer than 2 detected sentences.
 */
export function formatBriefTextForDisplay(raw: string): string {
  const t = raw.trim();
  if (!t || /\n{2,}/.test(t)) return t;

  const sentenceLike = t.match(/[^。！？.!?]+(?:[。！？]|[.!?](?=\s|$))/g);
  if (sentenceLike && sentenceLike.length >= 2) {
    const consumed = sentenceLike.join("");
    let out = sentenceLike.map((s) => s.trim()).join("\n\n");
    const tail = t.slice(consumed.length).trim();
    if (tail) out = `${out}\n\n${tail}`;
    return out;
  }

  return t;
}

function isPersistedTitleListOnlyBody(body: string, items: ArticleWithSource[]): boolean {
  if (!items.length) return false;
  const expected = items.map((item, idx) => `${idx + 1}. ${item.title}`).join("\n");
  return body.trim() === expected.trim();
}

function recentArticleWindow(since: Date) {
  return {
    OR: [
      { publishedAt: { gte: since } },
      {
        AND: [{ publishedAt: null }, { fetchedAt: { gte: since } }],
      },
    ],
  };
}

/** Fallback when DailyBrief not yet generated: recent AI-ranked articles, else recent legacy-ranked articles. */
export async function getFallbackTopArticles(): Promise<ArticleWithSource[]> {
  const since = subHours(new Date(), 48);
  const aiRanked = await prisma.article.findMany({
    where: {
      isRelevant: true,
      finalScore: { not: null },
      ...recentArticleWindow(since),
    },
    orderBy: [{ finalScore: "desc" }, { fetchedAt: "desc" }],
    take: 3,
    include: { source: true },
  });
  if (aiRanked.length) return aiRanked;

  return prisma.article.findMany({
    where: {
      AND: [
        { OR: [{ isRelevant: true }, { isRelevant: null }] },
        recentArticleWindow(since),
      ],
    },
    orderBy: [{ score: "desc" }, { fetchedAt: "desc" }],
    take: 3,
    include: { source: true },
  });
}

/**
 * Top 3 for homepage and /api/top: today's DailyBrief items, else recent ranked articles (48h).
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

  const persistedItems = brief?.items.map((i) => ({ ...i.article, source: i.article.source })) ?? [];
  const rawItems: ArticleWithSource[] = persistedItems.length ? persistedItems : await getDailyTopArticles();

  const items: TopBriefArticle[] = attachRepeatFromYesterday(rawItems, yesterdayIds);

  const emptyCopy = "当前暂无重要新闻，稍后更新";

  const storedBody = persistedItems.length ? (brief?.body?.trim() ?? "") : "";
  let text: string;
  if (storedBody && !isPersistedTitleListOnlyBody(storedBody, items)) {
    text = storedBody;
  } else if (items.length) {
    text = buildFallbackBriefText(items);
  } else {
    text = emptyCopy;
  }

  text = formatBriefTextForDisplay(text);

  return {
    title: "Today in Science",
    text,
    items,
  };
}
