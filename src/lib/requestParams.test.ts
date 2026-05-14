import assert from "node:assert/strict";
import test from "node:test";
import { parsePositiveIntegerParam } from "./requestParams";

test("parsePositiveIntegerParam falls back for missing or non-numeric values", () => {
  assert.equal(parsePositiveIntegerParam(null, 12, 50), 12);
  assert.equal(parsePositiveIntegerParam("abc", 12, 50), 12);
});

test("parsePositiveIntegerParam always returns a positive integer", () => {
  assert.equal(parsePositiveIntegerParam("0", 12, 50), 1);
  assert.equal(parsePositiveIntegerParam("-4", 12, 50), 1);
  assert.equal(parsePositiveIntegerParam("3.9", 12, 50), 3);
});

test("parsePositiveIntegerParam enforces an optional maximum", () => {
  assert.equal(parsePositiveIntegerParam("999", 12, 50), 50);
});
