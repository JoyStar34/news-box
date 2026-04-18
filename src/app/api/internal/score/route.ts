import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/internalAuth";
import { recordLastScore } from "@/lib/pipelineMetrics";
import { scorePendingArticles } from "@/server/ai/rankingPipeline";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const traceId = randomUUID();
  const start = Date.now();
  console.log(`[PIPELINE][SCORE][${traceId}] job started`);

  const result = await scorePendingArticles(30);
  recordLastScore(result.processed);

  console.log(
    `[PIPELINE][SCORE][${traceId}] processed=${result.processed} skipped=${result.skipped} duration=${Date.now() - start}ms`,
  );
  return NextResponse.json({ ok: true, result, traceId });
}
