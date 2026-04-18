import { NextRequest, NextResponse } from "next/server";
import { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RangeKey = "24h" | "7d" | "30d";
type SortKey = "latest" | "top";

function buildRangeDate(range: string | null): Date | null {
  if (!range) return null;
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const map: Record<RangeKey, number> = {
    "24h": 24 * hour,
    "7d": 7 * 24 * hour,
    "30d": 30 * 24 * hour,
  };

  if (!(range in map)) return null;
  return new Date(now - map[range as RangeKey]);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category");
  const sourceParam = searchParams.get("source");
  const rangeParam = searchParams.get("range");
  const sortParam = (searchParams.get("sort") ?? "latest") as SortKey;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "12")));
  const rangeStart = buildRangeDate(rangeParam);

  const where: {
    category?: Category;
    sourceId?: string;
    fetchedAt?: { gte: Date };
  } =
    categoryParam && Object.values(Category).includes(categoryParam as Category)
      ? { category: categoryParam as Category }
      : {};
  if (sourceParam) {
    where.sourceId = sourceParam;
  }
  if (rangeStart) {
    where.fetchedAt = { gte: rangeStart };
  }

  const total = await prisma.article.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const articles = await prisma.article.findMany({
    where,
    include: { source: true },
    orderBy:
      sortParam === "top"
        ? [{ finalScore: { sort: "desc", nulls: "last" } }, { score: "desc" }, { fetchedAt: "desc" }]
        : [{ fetchedAt: "desc" }, { score: "desc" }],
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });

  return NextResponse.json({
    data: articles,
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
      range: rangeParam,
      sort: sortParam,
      source: sourceParam,
    },
  });
}

