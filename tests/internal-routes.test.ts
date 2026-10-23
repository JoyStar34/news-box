import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET as debugPipeline } from "../src/app/api/debug/pipeline/route";
import * as backfill from "../src/app/api/internal/backfill-why-important/route";
import { POST as fetchFeeds } from "../src/app/api/internal/fetch/route";
import { POST as score } from "../src/app/api/internal/score/route";
import { POST as summarize } from "../src/app/api/internal/summarize/route";
import { POST as dailyTop } from "../src/app/api/internal/daily-top/route";

const secret = "test-only-cron-secret-0123456789abcdef";

function setTestEnv(t: { after: (fn: () => void) => void }) {
  const originalSecret = process.env.CRON_SECRET;
  const originalDebug = process.env.ENABLE_PIPELINE_DEBUG;
  process.env.CRON_SECRET = secret;
  delete process.env.ENABLE_PIPELINE_DEBUG;
  t.after(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
    if (originalDebug === undefined) delete process.env.ENABLE_PIPELINE_DEBUG;
    else process.env.ENABLE_PIPELINE_DEBUG = originalDebug;
  });
}

test("debug metrics are disabled by default, even for an authenticated request", async (t) => {
  setTestEnv(t);
  const response = await debugPipeline(new NextRequest("http://localhost/api/debug/pipeline", {
    headers: { authorization: `Bearer ${secret}` },
  }));
  assert.equal(response.status, 404);
});

test("enabled debug metrics remain protected and cannot be cached", async (t) => {
  setTestEnv(t);
  process.env.ENABLE_PIPELINE_DEBUG = "true";
  assert.equal((await debugPipeline(new NextRequest("http://localhost/api/debug/pipeline"))).status, 401);
  const response = await debugPipeline(new NextRequest("http://localhost/api/debug/pipeline", {
    headers: { authorization: `Bearer ${secret}` },
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys(await response.json()).sort(), [
    "dailyTopGenerated", "lastFetchInserted", "lastScoreProcessed", "lastSummarized",
  ]);
});

test("every internal job rejects unauthenticated requests before database or network work", async (t) => {
  setTestEnv(t);
  for (const handler of [fetchFeeds, score, summarize, dailyTop, backfill.POST]) {
    for (const authorization of ["", secret, "Bearer wrong-token"]) {
      const response = await handler(new NextRequest("http://localhost/api/internal/test", {
        method: "POST", headers: { authorization },
      }));
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: "Unauthorized" });
    }
  }
});

test("maintenance writes cannot be invoked through a GET handler", () => {
  assert.equal("GET" in backfill, false);
});
