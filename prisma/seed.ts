import { PrismaClient, Category } from "@prisma/client";

const prisma = new PrismaClient();

const seedSources = [
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: Category.TECH, priority: 2 },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: Category.TECH, priority: 3 },
  { name: "Ars Technica", url: "http://feeds.arstechnica.com/arstechnica/index", category: Category.TECH, priority: 3 },
  { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", category: Category.TECH, priority: 3 },
  { name: "Nature", url: "https://www.nature.com/nature.rss", category: Category.SCIENCE, priority: 5 },
  { name: "Science", url: "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science", category: Category.SCIENCE, priority: 5 },
  { name: "Scientific American", url: "https://www.scientificamerican.com/feed/", category: Category.SCIENCE, priority: 4 },
  { name: "NASA", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", category: Category.ASTRONOMY, priority: 4 },
  { name: "Space.com", url: "https://www.space.com/feeds/all", category: Category.ASTRONOMY, priority: 3 },
  { name: "Universe Today", url: "https://www.universetoday.com/feed/", category: Category.ASTRONOMY, priority: 3 },
  { name: "arXiv astro-ph", url: "http://export.arxiv.org/rss/astro-ph", category: Category.ASTRONOMY, priority: 4 },
  { name: "arXiv physics", url: "http://export.arxiv.org/rss/physics", category: Category.PAPER, priority: 3 },
  { name: "arXiv cs.AI", url: "http://export.arxiv.org/rss/cs.AI", category: Category.AI, priority: 4 },
];

async function main() {
  for (const source of seedSources) {
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
        score: 8.5,
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

