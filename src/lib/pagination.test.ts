import assert from "node:assert/strict";
import test from "node:test";
import { parsePositiveIntParam } from "./pagination";

test("parsePositiveIntParam falls back for invalid values", () => {
  assert.equal(parsePositiveIntParam("abc", { defaultValue: 1 }), 1);
  assert.equal(parsePositiveIntParam(Number.NaN, { defaultValue: 12 }), 12);
});

test("parsePositiveIntParam returns bounded positive integers", () => {
  assert.equal(parsePositiveIntParam("1.9", { defaultValue: 1 }), 1);
  assert.equal(parsePositiveIntParam("0", { defaultValue: 1 }), 1);
  assert.equal(parsePositiveIntParam("100", { defaultValue: 12, max: 50 }), 50);
});
