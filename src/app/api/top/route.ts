import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const top = await prisma.article.findMany({
    orderBy: [{ score: "desc" }, { fetchedAt: "desc" }],
    include: { source: true },
    take: 3,
  });

  return NextResponse.json({ data: top });
}

