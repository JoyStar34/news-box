import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { fetchFeeds } from "@/server/rss/fetchFeeds";
import { generateDailyTopNews } from "@/server/brief/dailyTopJob";

export const dynamic = "force-dynamic";

export async function POST() {
  const traceId = randomUUID();
  const start = Date.now();

  try {
    console.log(`[PIPELINE][GENERATE_TODAY][${traceId}] job started`);
    const fetchResult = await fetchFeeds(traceId);
    const topResult = await generateDailyTopNews();
    revalidatePath("/");

    console.log(
      `[PIPELINE][GENERATE_TODAY][${traceId}] inserted=${fetchResult.inserted} topOk=${topResult.ok} duration=${Date.now() - start}ms`,
    );

    return NextResponse.json({
      ok: topResult.ok,
      traceId,
      fetch: fetchResult,
      top: topResult,
    });
  } catch (error) {
    console.error(`[ERROR][GENERATE_TODAY][${traceId}]`, error);
    return NextResponse.json(
      {
        ok: false,
        traceId,
        error: error instanceof Error ? error.message : "生成失败",
      },
      { status: 500 },
    );
  }
}
