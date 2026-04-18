import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/internalAuth";
import { getPipelineMetricsSnapshot } from "@/lib/pipelineMetrics";

/** Last-run pipeline counters (in-memory, per server instance). Requires CRON_SECRET. */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getPipelineMetricsSnapshot());
}
