import crypto from "node:crypto";
import { Category } from "@prisma/client";
import { safeArticleUrl } from "@/lib/articleUrl";

type RawFeedItem = {
  title?: string;
  content?: string;
  contentSnippet?: string;
  summary?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
};

export type NormalizedItem = {
  title: string;
  summaryRaw: string | null;
  url: string;
  publishedAt: Date | null;
  category: Category;
  contentHash: string;
};

function cleanText(input: string | undefined): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeFeedItem(item: RawFeedItem, category: Category): NormalizedItem | null {
  const title = cleanText(item.title);
  const url = safeArticleUrl(item.link);
  const summaryRaw = cleanText(item.contentSnippet ?? item.summary ?? item.content);
  const publishedRaw = item.isoDate ?? item.pubDate;
  const publishedAt = publishedRaw ? new Date(publishedRaw) : null;

  if (!title || !url) {
    return null;
  }

  return {
    title,
    summaryRaw: summaryRaw || null,
    url,
    publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    category,
    contentHash: crypto.createHash("sha256").update(title).digest("hex"),
  };
}

