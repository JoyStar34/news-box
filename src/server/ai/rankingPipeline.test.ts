import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseImportance, parseRelevance, pendingScoreWhere } from "./rankingPipeline";

describe("parseRelevance", () => {
  it("treats common negative relevance formats as irrelevant", () => {
    assert.equal(parseRelevance("NOT_RELEVANT"), false);
    assert.equal(parseRelevance("NOT RELEVANT"), false);
    assert.equal(parseRelevance("not-relevant"), false);
    assert.equal(parseRelevance("This article is irrelevant."), false);
  });

  it("treats explicit positive relevance as relevant", () => {
    assert.equal(parseRelevance("RELEVANT"), true);
    assert.equal(parseRelevance("This is relevant."), true);
  });

  it("leaves ambiguous responses retryable", () => {
    assert.equal(parseRelevance("unclear"), null);
    assert.equal(parseRelevance(""), null);
  });
});

describe("parseImportance", () => {
  it("parses only in-range scores", () => {
    assert.equal(parseImportance("87"), 87);
    assert.equal(parseImportance("101"), null);
    assert.equal(parseImportance("no score"), null);
  });
});

describe("pendingScoreWhere", () => {
  it("includes new rows and relevant rows missing a final score", () => {
    assert.deepEqual(pendingScoreWhere, {
      OR: [{ isRelevant: null }, { isRelevant: true, finalScore: null }],
    });
  });
});
