import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRelevance } from "./parseRelevance";

describe("parseRelevance", () => {
  it("accepts the requested positive model label", () => {
    assert.equal(parseRelevance("RELEVANT"), true);
  });

  it("accepts underscore, spaced, and hyphenated negative labels", () => {
    assert.equal(parseRelevance("NOT_RELEVANT"), false);
    assert.equal(parseRelevance("NOT RELEVANT"), false);
    assert.equal(parseRelevance("not-relevant"), false);
  });

  it("does not classify irrelevant as relevant by substring", () => {
    assert.equal(parseRelevance("IRRELEVANT"), false);
  });

  it("leaves unrelated responses for retry handling", () => {
    assert.equal(parseRelevance("unclear"), null);
  });
});
