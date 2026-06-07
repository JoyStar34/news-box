import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseImportance, parseRelevance } from "./rankingPipeline";

describe("parseRelevance", () => {
  it("treats negative relevance responses as irrelevant", () => {
    assert.equal(parseRelevance("NOT_RELEVANT"), false);
    assert.equal(parseRelevance("NOT RELEVANT"), false);
    assert.equal(parseRelevance("not-relevant"), false);
    assert.equal(parseRelevance("IRRELEVANT"), false);
  });

  it("treats explicit relevant responses as relevant", () => {
    assert.equal(parseRelevance("RELEVANT"), true);
    assert.equal(parseRelevance("Relevant."), true);
  });

  it("leaves malformed relevance responses unparsed for retry", () => {
    assert.equal(parseRelevance("This may be useful later."), null);
  });
});

describe("parseImportance", () => {
  it("returns null for out-of-contract importance responses", () => {
    assert.equal(parseImportance("high"), null);
    assert.equal(parseImportance("101"), null);
  });

  it("parses valid importance scores", () => {
    assert.equal(parseImportance("0"), 0);
    assert.equal(parseImportance("87"), 87);
    assert.equal(parseImportance("100"), 100);
  });
});
