import { NextRequest, NextResponse } from "next/server";
import { summarizePendingArticles } from "@/server/ai/summarize";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  return token === secret;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await summarizePendingArticles(30);
  return NextResponse.json({ ok: true, result });
}

