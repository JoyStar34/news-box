import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/internalAuth";
import { recordLastSummarize } from "@/lib/pipelineMetrics";
import { summarizePendingArticles } from "@/server/ai/summarize";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const traceId = randomUUID();
  const start = Date.now();
  console.log(`[PIPELINE][SUMMARIZE][${traceId}] job started`);

  const result = await summarizePendingArticles(30);
  recordLastSummarize(result.processed);

  console.log(
    `[PIPELINE][SUMMARIZE][${traceId}] processed=${result.processed} skipped=${result.skipped} duration=${Date.now() - start}ms`,
  );
  return NextResponse.json({ ok: true, result, traceId });
}

