import { NextRequest, NextResponse } from "next/server";
import { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category");
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  const where =
    categoryParam && Object.values(Category).includes(categoryParam as Category)
      ? { category: categoryParam as Category }
      : {};

  const articles = await prisma.article.findMany({
    where,
    include: { source: true },
    orderBy: [{ fetchedAt: "desc" }, { score: "desc" }],
    skip: Math.max(0, page - 1) * pageSize,
    take: Math.min(50, Math.max(1, pageSize)),
  });

  return NextResponse.json({ data: articles });
}

