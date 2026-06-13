import assert from "node:assert/strict";
import test from "node:test";
import { extractDailyBriefArticles, type ArticleWithSource } from "./dailyBriefService";

test("extractDailyBriefArticles returns null for missing or empty brief items", () => {
  assert.equal(extractDailyBriefArticles(undefined), null);
  assert.equal(extractDailyBriefArticles([]), null);
});

test("extractDailyBriefArticles maps persisted brief items to articles", () => {
  const source = {
    id: "source-1",
    name: "Example Source",
    url: "https://example.com/rss",
    category: "SCIENCE",
    priority: 1,
    weight: 1,
    isActive: true,
    fetchIntervalMin: 360,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  const article = {
    id: "article-1",
    sourceId: source.id,
    source,
    title: "Important discovery",
    summaryRaw: null,
    summaryAi: null,
    whyImportant: null,
    url: "https://example.com/article",
    publishedAt: null,
    fetchedAt: new Date("2026-01-01T00:00:00.000Z"),
    category: "SCIENCE",
    score: 0,
    contentHash: null,
    relevanceScore: 100,
    importanceScore: 90,
    finalScore: 90,
    topic: null,
    isRelevant: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  } as ArticleWithSource;

  assert.deepEqual(extractDailyBriefArticles([{ article }]), [article]);
});
