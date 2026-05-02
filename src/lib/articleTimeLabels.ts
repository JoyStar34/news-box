import { differenceInHours } from "date-fns";
import type { Article } from "@prisma/client";

/** Reference time for “发布时间” — prefers publishedAt, else fetchedAt */
export function getArticleTimeRef(article: Pick<Article, "publishedAt" | "fetchedAt">): Date {
  return article.publishedAt ?? article.fetchedAt;
}

/**
 * Relative freshness label for Top / highlight cards (server or client).
 */
export function getTimeLabel(article: Pick<Article, "publishedAt" | "fetchedAt">): string {
  const now = new Date();
  const published = getArticleTimeRef(article);
  const hours = differenceInHours(now, published);

  if (hours < 0) return "刚刚发布";
  if (hours < 6) return "刚刚发布";
  if (hours < 24) return `${hours}小时前`;
  return "昨日重要";
}
