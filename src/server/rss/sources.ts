import { Category } from "@prisma/client";

export type SourceSeed = {
  name: string;
  url: string;
  category: Category;
  priority: number;
  /** 0–1, used in final_score (Nature/Science ≈ 1.0, Verge ≈ 0.6) */
  weight: number;
};

export const RSS_SOURCES: SourceSeed[] = [
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: Category.TECH, priority: 2, weight: 0.7 },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: Category.TECH, priority: 3, weight: 0.6 },
  { name: "Ars Technica", url: "http://feeds.arstechnica.com/arstechnica/index", category: Category.TECH, priority: 3, weight: 0.75 },
  { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", category: Category.TECH, priority: 3, weight: 0.9 },
  { name: "Nature", url: "https://www.nature.com/nature.rss", category: Category.SCIENCE, priority: 5, weight: 1.0 },
  { name: "Science", url: "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science", category: Category.SCIENCE, priority: 5, weight: 1.0 },
  {
    name: "Scientific American",
    url: "https://www.scientificamerican.com/feed/",
    category: Category.SCIENCE,
    priority: 4,
    weight: 0.85,
  },
  { name: "NASA", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", category: Category.ASTRONOMY, priority: 4, weight: 0.95 },
  { name: "Space.com", url: "https://www.space.com/feeds/all", category: Category.ASTRONOMY, priority: 3, weight: 0.75 },
  { name: "Universe Today", url: "https://www.universetoday.com/feed/", category: Category.ASTRONOMY, priority: 3, weight: 0.72 },
  { name: "arXiv astro-ph", url: "http://export.arxiv.org/rss/astro-ph", category: Category.ASTRONOMY, priority: 4, weight: 0.9 },
  { name: "arXiv physics", url: "http://export.arxiv.org/rss/physics", category: Category.PAPER, priority: 3, weight: 0.9 },
  { name: "arXiv cs.AI", url: "http://export.arxiv.org/rss/cs.AI", category: Category.AI, priority: 4, weight: 0.9 },
];
