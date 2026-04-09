import { NextRequest, NextResponse } from "next/server";
import { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "12")));

  const where =
    categoryParam && Object.values(Category).includes(categoryParam as Category)
      ? { category: categoryParam as Category }
      : {};

  const total = await prisma.article.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const articles = await prisma.article.findMany({
    where,
    include: { source: true },
    orderBy: [{ fetchedAt: "desc" }, { score: "desc" }],
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
    },
  });
}

