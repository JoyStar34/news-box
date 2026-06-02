import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseImportance, parseRelevance } from "./rankingPipeline";

describe("parseRelevance", () => {
  it("recognizes positive relevance responses", () => {
    assert.equal(parseRelevance("RELEVANT"), true);
    assert.equal(parseRelevance("This is relevant."), true);
  });

  it("recognizes negative relevance variants", () => {
    assert.equal(parseRelevance("NOT_RELEVANT"), false);
    assert.equal(parseRelevance("NOT RELEVANT"), false);
    assert.equal(parseRelevance("This is not relevant."), false);
    assert.equal(parseRelevance("IRRELEVANT"), false);
  });

  it("does not guess on ambiguous relevance responses", () => {
    assert.equal(parseRelevance("unclear"), null);
    assert.equal(parseRelevance("not enough context to decide relevance"), null);
  });
});

describe("parseImportance", () => {
  it("parses valid integer scores", () => {
    assert.equal(parseImportance("87"), 87);
    assert.equal(parseImportance("Score: 42"), 42);
  });

  it("rejects missing or out-of-range scores", () => {
    assert.equal(parseImportance("high impact"), null);
    assert.equal(parseImportance("101"), null);
  });
});
