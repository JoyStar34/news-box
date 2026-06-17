import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePositiveInt } from "./pagination";

describe("parsePositiveInt", () => {
  it("accepts positive integer strings", () => {
    assert.equal(parsePositiveInt("1", 99), 1);
    assert.equal(parsePositiveInt("12", 99), 12);
  });

  it("falls back for values that would crash Prisma skip/take", () => {
    assert.equal(parsePositiveInt("1.5", 1), 1);
    assert.equal(parsePositiveInt("NaN", 1), 1);
    assert.equal(parsePositiveInt("Infinity", 1), 1);
    assert.equal(parsePositiveInt("-2", 1), 1);
    assert.equal(parsePositiveInt("0", 1), 1);
  });

  it("clamps valid integers to an optional maximum", () => {
    assert.equal(parsePositiveInt("500", 12, 50), 50);
    assert.equal(parsePositiveInt("24", 12, 50), 24);
  });
});
