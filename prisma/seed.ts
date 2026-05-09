import { PrismaClient, Category } from "@prisma/client";
import { ensureWhyImportant, fallbackSummaryAiText } from "../src/lib/articleDisplayDefaults";
import { RSS_SOURCES, sourceSeedForPrisma } from "@/server/rss/sources";

const prisma = new PrismaClient();

async function main() {
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

  const techCrunch = await prisma.source.findUnique({
    where: { url: "https://techcrunch.com/feed/" },
  });

  if (techCrunch) {
    await prisma.article.upsert({
      where: { url: "https://example.com/news/sample-ai-breakthrough" },
      update: {},
      create: {
        sourceId: techCrunch.id,
        title: "Sample: New AI model improves scientific reasoning",
        summaryRaw: "A benchmark result shows a major improvement for multi-step scientific reasoning.",
        summaryAi:
          "A new AI model shows stronger scientific reasoning across multi-step tasks. It performs better on benchmark datasets used in research workflows. The improvement suggests faster experimentation support for scientists.",
        whyImportant: "It can reduce research iteration time and accelerate scientific discovery pipelines.",
        url: "https://example.com/news/sample-ai-breakthrough",
        category: Category.AI,
        score: 85,
        isRelevant: true,
        importanceScore: 85,
        finalScore: 85,
        relevanceScore: 100,
      },
    });
  }

  const stale = await prisma.article.findMany({
    where: {
      OR: [
        { summaryAi: null },
        { whyImportant: null },
        { summaryAi: "" },
        { whyImportant: "" },
      ],
    },
  });
  for (const row of stale) {
    await prisma.article.update({
      where: { id: row.id },
      data: {
        summaryAi: row.summaryAi?.trim() || fallbackSummaryAiText(row.summaryRaw),
        whyImportant: ensureWhyImportant(row.whyImportant),
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
