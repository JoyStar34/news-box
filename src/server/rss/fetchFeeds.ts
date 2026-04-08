import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";
import { normalizeFeedItem } from "@/server/rss/normalizeFeedItem";
import { RSS_SOURCES } from "@/server/rss/sources";
import { calculateScore } from "@/server/scoring/calculateScore";

const parser = new Parser();
const MAX_ITEMS_PER_SOURCE = 10;

export async function syncSources() {
  for (const source of RSS_SOURCES) {
    await prisma.source.upsert({
      where: { url: source.url },
      update: {
        name: source.name,
        category: source.category,
        priority: source.priority,
        isActive: true,
      },
      create: source,
    });
  }
}

export async function fetchFeeds() {
  await syncSources();

  const activeSources = await prisma.source.findMany({
    where: { isActive: true },
  });

  let inserted = 0;
  let failed = 0;

  for (const source of activeSources) {
    try {
      const feed = await parser.parseURL(source.url);
      const items = (feed.items ?? []).slice(0, MAX_ITEMS_PER_SOURCE);

      for (const item of items) {
        const normalized = normalizeFeedItem(item, source.category);
        if (!normalized) continue;

        const score = calculateScore({
          publishedAt: normalized.publishedAt,
          fetchedAt: new Date(),
          sourcePriority: source.priority,
        });

        await prisma.article.upsert({
          where: { url: normalized.url },
          update: {
            title: normalized.title,
            summaryRaw: normalized.summaryRaw,
            publishedAt: normalized.publishedAt,
            category: normalized.category,
            contentHash: normalized.contentHash,
            score,
            fetchedAt: new Date(),
          },
          create: {
            sourceId: source.id,
            title: normalized.title,
            summaryRaw: normalized.summaryRaw,
            url: normalized.url,
            publishedAt: normalized.publishedAt,
            category: normalized.category,
            contentHash: normalized.contentHash,
            score,
          },
        });

        inserted += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(`Fetch failed: ${source.name}`, error);
    }
  }

  return { inserted, failed, sources: activeSources.length };
}

