import assert from "node:assert/strict";
import test from "node:test";
import { parsePositiveIntegerParam } from "./requestParams";

test("parsePositiveIntegerParam returns positive integer query values", () => {
  assert.equal(parsePositiveIntegerParam("3", 1), 3);
  assert.equal(parsePositiveIntegerParam("3.8", 1), 3);
});

test("parsePositiveIntegerParam falls back for invalid or non-finite values", () => {
  assert.equal(parsePositiveIntegerParam(null, 12), 12);
  assert.equal(parsePositiveIntegerParam("abc", 12), 12);
  assert.equal(parsePositiveIntegerParam("Infinity", 12), 12);
});

test("parsePositiveIntegerParam clamps lower and upper bounds", () => {
  assert.equal(parsePositiveIntegerParam("-2", 1), 1);
  assert.equal(parsePositiveIntegerParam("100", 12, 50), 50);
});
