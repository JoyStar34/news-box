import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/internalAuth";
import { recordLastSummarize } from "@/lib/pipelineMetrics";
import { summarizePendingArticles } from "@/server/ai/summarize";
import { positiveInteger } from "@/lib/requestLimits";

function parseMaxItems(request: NextRequest): number {
  const url = new URL(request.url);
  const q = url.searchParams.get("maxItems") ?? url.searchParams.get("limit");
  return positiveInteger(q, 100, 500);
}

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const traceId = randomUUID();
  const start = Date.now();
  console.log(`[PIPELINE][SUMMARIZE][${traceId}] job started`);

  let maxItems = parseMaxItems(request);
  try {
    const body = await request.json();
    if (body && typeof body.maxItems === "number") {
      maxItems = positiveInteger(body.maxItems, maxItems, 500);
    }
  } catch {
    // no JSON body
  }

  const result = await summarizePendingArticles(maxItems);
  recordLastSummarize(result.processed);

  console.log(
    `[PIPELINE][SUMMARIZE][${traceId}] processed=${result.processed} skipped=${result.skipped} duration=${Date.now() - start}ms`,
  );
  return NextResponse.json({ ok: true, result, traceId });
}

