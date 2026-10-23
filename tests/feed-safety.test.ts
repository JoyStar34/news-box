import assert from "node:assert/strict";
import test from "node:test";
import { Category } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { syncSources } from "../src/server/rss/fetchFeeds";
import { normalizeFeedItem } from "../src/server/rss/normalizeFeedItem";
import { RSS_SOURCES } from "../src/server/rss/sources";

test("source synchronization preserves administrator-disabled feeds", async (t) => {
  // Replace the only database operation before invoking the synchronization logic.
  // No real database, RSS service, or AI provider is contacted by these tests.
  const rows = new Map(RSS_SOURCES.map((source) => [source.url, { isActive: false }]));
  const originalUpsert = prisma.source.upsert;
  const upsert = t.mock.fn(async (args: {
    where: { url: string };
    update: Record<string, unknown>;
    create: Record<string, unknown>;
  }) => {
    assert.equal("isActive" in args.update, false);
    assert.equal("type" in args.update, false);
    const row = rows.get(args.where.url);
    assert.ok(row);
    Object.assign(row, args.update);
    return row;
  });
  // Prisma delegates are proxies rather than ordinary own methods, so install the
  // stub explicitly and verify it before running anything that could query the DB.
  prisma.source.upsert = upsert as unknown as typeof originalUpsert;
  t.after(() => { prisma.source.upsert = originalUpsert; });
  assert.equal(prisma.source.upsert, upsert);

  await syncSources();
  assert.equal(upsert.mock.callCount(), RSS_SOURCES.length);
  for (const row of rows.values()) assert.equal(row.isActive, false);
});

test("feed normalization rejects executable and credential-bearing article links", () => {
  for (const link of ["javascript:alert(1)", "data:text/html,unsafe", "https://user:pass@example.com/story", "/relative"]) {
    assert.equal(normalizeFeedItem({ title: "A news story", link }, Category.TECH), null);
  }
  const article = normalizeFeedItem({
    title: "<b>A news story</b>", link: "https://example.com/story",
    contentSnippet: "<p>A short summary.</p>", pubDate: "not-a-date",
  }, Category.TECH);
  assert.ok(article);
  assert.equal(article.title, "A news story");
  assert.equal(article.summaryRaw, "A short summary.");
  assert.equal(article.publishedAt, null);
});
