import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/internalAuth";
import { summarizePendingArticles } from "@/server/ai/summarize";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await summarizePendingArticles(30);
  return NextResponse.json({ ok: true, result });
}

