import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/internalAuth";
import { recordDailyTop } from "@/lib/pipelineMetrics";
import { generateDailyTopNews } from "@/server/brief/dailyTopJob";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const traceId = randomUUID();
  const start = Date.now();
  console.log(`[PIPELINE][DAILY_TOP][${traceId}] job started`);

  const result = await generateDailyTopNews();
  recordDailyTop(result.ok);

  console.log(
    `[PIPELINE][DAILY_TOP][${traceId}] ok=${result.ok} articleIds=${result.articleIds.length} duration=${Date.now() - start}ms`,
  );
  return NextResponse.json({ ok: true, result, traceId });
}
