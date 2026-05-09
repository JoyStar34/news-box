import Parser from "rss-parser";
import { PERSISTED_WHY_FALLBACK } from "@/lib/articleDisplayDefaults";
import { prisma } from "@/lib/prisma";
import { normalizeFeedItem } from "@/server/rss/normalizeFeedItem";
import { RSS_SOURCES, sourceSeedForPrisma } from "@/server/rss/sources";
import { calculateScore } from "@/server/scoring/calculateScore";

const parser = new Parser();
const MAX_ITEMS_PER_SOURCE = 10;

export async function syncSources() {
  for (const source of RSS_SOURCES) {
    const row = sourceSeedForPrisma(source);
    await prisma.source.upsert({
      where: { url: source.url },
      update: {
        ...row,
        isActive: true,
      },
      create: row,
    });
  }
}

export async function fetchFeeds(traceId?: string) {
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
            whyImportant: PERSISTED_WHY_FALLBACK,
          },
        });

        await prisma.article.updateMany({
          where: {
            url: normalized.url,
            OR: [{ whyImportant: null }, { whyImportant: "" }],
          },
          data: { whyImportant: PERSISTED_WHY_FALLBACK },
        });

        inserted += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(
        `[ERROR][FETCH]${traceId ? ` traceId=${traceId}` : ""} source=${source.name}`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return { inserted, failed, sources: activeSources.length };
}
