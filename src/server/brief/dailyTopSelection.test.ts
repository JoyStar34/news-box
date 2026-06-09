import assert from "node:assert/strict";
import test from "node:test";
import { getRecentBriefDemotionRange } from "./dailyTopSelection";

test("recent brief demotion range includes prior UTC days but excludes today", () => {
  const range = getRecentBriefDemotionRange(new Date("2026-06-09T11:00:53.820Z"));

  assert.equal(range.gte.toISOString(), "2026-06-07T00:00:00.000Z");
  assert.equal(range.lt.toISOString(), "2026-06-09T00:00:00.000Z");
});
