import { NextRequest, NextResponse } from "next/server";
import { fetchFeeds } from "@/server/rss/fetchFeeds";

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

  const result = await fetchFeeds();
  return NextResponse.json({ ok: true, result });
}

