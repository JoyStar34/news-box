import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/internalAuth";
import { scorePendingArticles } from "@/server/ai/rankingPipeline";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await scorePendingArticles(30);
  return NextResponse.json({ ok: true, result });
}
