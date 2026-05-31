import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseImportance, parseRelevance } from "../src/server/ai/rankingPipeline";

describe("parseRelevance", () => {
  it("recognizes explicit relevant responses", () => {
    assert.equal(parseRelevance("RELEVANT"), true);
    assert.equal(parseRelevance("This article is relevant."), true);
  });

  it("recognizes common not-relevant responses", () => {
    assert.equal(parseRelevance("NOT_RELEVANT"), false);
    assert.equal(parseRelevance("NOT RELEVANT"), false);
    assert.equal(parseRelevance("This is not relevant."), false);
    assert.equal(parseRelevance("irrelevant"), false);
  });

  it("keeps ambiguous responses retryable", () => {
    assert.equal(parseRelevance("UNCLEAR"), null);
    assert.equal(parseRelevance(""), null);
  });
});

describe("parseImportance", () => {
  it("accepts integer scores in range", () => {
    assert.equal(parseImportance("85"), 85);
    assert.equal(parseImportance("Score: 42"), 42);
  });

  it("rejects missing or out-of-range scores", () => {
    assert.equal(parseImportance("N/A"), null);
    assert.equal(parseImportance("101"), null);
  });
});
