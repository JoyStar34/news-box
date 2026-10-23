import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { PERSISTED_WHY_FALLBACK } from "@/lib/articleDisplayDefaults";
import { isCronAuthorized } from "@/lib/internalAuth";
import { prisma } from "@/lib/prisma";
import { positiveInteger } from "@/lib/requestLimits";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 10_000;

/**
 * 一次性 / 定期补齐 whyImportant：null、空串、全空白 → 「暂无解读」
 * POST ?limit= 或 JSON body { "limit": number }
 */
export async function POST(request: NextRequest) {
  return handleBackfill(request);
}

async function handleBackfill(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const traceId = randomUUID();
  const url = new URL(request.url);
  let limit = positiveInteger(url.searchParams.get("limit"), 0, MAX_LIMIT);

  if (!Number.isFinite(limit) || limit <= 0) {
    if (request.method === "POST") {
      try {
        const body = await request.json();
        if (body && typeof body.limit === "number") {
          limit = positiveInteger(body.limit, 0, MAX_LIMIT);
        }
      } catch {
        // no JSON body
      }
    }
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    limit = DEFAULT_LIMIT;
  }

  const start = Date.now();

  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id FROM "Article"
      WHERE "whyImportant" IS NULL
         OR TRIM(BOTH FROM COALESCE("whyImportant", '')) = ''
      LIMIT ${limit}
    `,
  );

  const ids = rows.map((r) => r.id);

  if (ids.length === 0) {
    console.log(`[BACKFILL_WHY][${traceId}] updated=0 (none matched)`);
    return NextResponse.json({
      ok: true,
      updated: 0,
      limit,
      traceId,
      durationMs: Date.now() - start,
    });
  }

  const result = await prisma.article.updateMany({
    where: { id: { in: ids } },
    data: { whyImportant: PERSISTED_WHY_FALLBACK },
  });

  console.log(
    `[BACKFILL_WHY][${traceId}] updated=${result.count} requestedLimit=${limit} scannedIds=${ids.length} duration=${Date.now() - start}ms`,
  );

  return NextResponse.json({
    ok: true,
    updated: result.count,
    limit,
    traceId,
    durationMs: Date.now() - start,
  });
}
