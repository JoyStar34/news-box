import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/internalAuth";
import { recordLastFetch } from "@/lib/pipelineMetrics";
import { fetchFeeds } from "@/server/rss/fetchFeeds";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const traceId = randomUUID();
  const start = Date.now();
  console.log(`[PIPELINE][FETCH][${traceId}] job started`);

  const result = await fetchFeeds(traceId);
  recordLastFetch(result.inserted);

  console.log(
    `[PIPELINE][FETCH][${traceId}] inserted=${result.inserted} failed=${result.failed} sources=${result.sources} duration=${Date.now() - start}ms`,
  );
  return NextResponse.json({ ok: true, result, traceId });
}

