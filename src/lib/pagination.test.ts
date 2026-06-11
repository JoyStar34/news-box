import assert from "node:assert/strict";
import { test } from "node:test";

import { parsePositiveInt } from "@/lib/pagination";

test("parsePositiveInt accepts positive integer strings", () => {
  assert.equal(parsePositiveInt("1", 9), 1);
  assert.equal(parsePositiveInt("25", 9), 25);
});

test("parsePositiveInt falls back for unsafe Prisma pagination values", () => {
  assert.equal(parsePositiveInt(null, 12), 12);
  assert.equal(parsePositiveInt("abc", 12), 12);
  assert.equal(parsePositiveInt("NaN", 12), 12);
  assert.equal(parsePositiveInt("Infinity", 12), 12);
  assert.equal(parsePositiveInt("0", 12), 12);
  assert.equal(parsePositiveInt("-1", 12), 12);
  assert.equal(parsePositiveInt("1.5", 12), 12);
});
