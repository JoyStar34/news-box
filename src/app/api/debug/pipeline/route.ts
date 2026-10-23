import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/internalAuth";
import { getPipelineMetricsSnapshot } from "@/lib/pipelineMetrics";

/** Opt-in last-run counters (in-memory, per server instance). Still requires CRON_SECRET. */
export async function GET(request: NextRequest) {
  if (process.env.ENABLE_PIPELINE_DEBUG !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getPipelineMetricsSnapshot(), { headers: { "Cache-Control": "no-store" } });
}
