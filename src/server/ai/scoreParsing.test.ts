import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseImportance, parseRelevance, SCORING_QUEUE_WHERE } from "./scoreParsing";

describe("parseRelevance", () => {
  it("recognizes negative relevance responses before positive tokens", () => {
    assert.equal(parseRelevance("NOT_RELEVANT"), false);
    assert.equal(parseRelevance("NOT RELEVANT"), false);
    assert.equal(parseRelevance("not-relevant"), false);
    assert.equal(parseRelevance("Irrelevant"), false);
  });

  it("recognizes relevant responses", () => {
    assert.equal(parseRelevance("RELEVANT"), true);
    assert.equal(parseRelevance("Relevant."), true);
    assert.equal(parseRelevance("This article is relevant"), true);
  });

  it("leaves unparseable responses retryable", () => {
    assert.equal(parseRelevance("I cannot determine this from the summary."), null);
    assert.equal(parseRelevance(""), null);
  });
});

describe("parseImportance", () => {
  it("accepts only scores in the supported range", () => {
    assert.equal(parseImportance("87"), 87);
    assert.equal(parseImportance("Score: 100"), 100);
    assert.equal(parseImportance("101"), null);
    assert.equal(parseImportance("not sure"), null);
  });
});

describe("SCORING_QUEUE_WHERE", () => {
  it("includes both unclassified and half-scored relevant articles", () => {
    assert.deepEqual(SCORING_QUEUE_WHERE, {
      OR: [{ isRelevant: null }, { isRelevant: true, finalScore: null }],
    });
  });
});
