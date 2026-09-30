import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseImportance, parseRelevance, SCORING_QUEUE_WHERE } from "./scoreParsing";

describe("parseRelevance", () => {
  it("accepts positive relevance responses", () => {
    assert.equal(parseRelevance("RELEVANT"), true);
    assert.equal(parseRelevance("Relevant."), true);
    assert.equal(parseRelevance("This article is relevant to AI research."), true);
  });

  it("rejects common negative relevance variants", () => {
    assert.equal(parseRelevance("NOT_RELEVANT"), false);
    assert.equal(parseRelevance("NOT RELEVANT"), false);
    assert.equal(parseRelevance("not-relevant"), false);
    assert.equal(parseRelevance("This is not relevant for the science feed."), false);
    assert.equal(parseRelevance("irrelevant"), false);
  });

  it("keeps ambiguous responses retryable", () => {
    assert.equal(parseRelevance("I cannot determine this from the available text."), null);
    assert.equal(parseRelevance(""), null);
  });
});

describe("parseImportance", () => {
  it("parses bounded integer scores", () => {
    assert.equal(parseImportance("0"), 0);
    assert.equal(parseImportance("87"), 87);
    assert.equal(parseImportance("100"), 100);
  });

  it("rejects missing or out-of-range scores", () => {
    assert.equal(parseImportance("no score"), null);
    assert.equal(parseImportance("101"), null);
  });
});

describe("SCORING_QUEUE_WHERE", () => {
  it("includes new and partially scored articles", () => {
    assert.deepEqual(SCORING_QUEUE_WHERE, {
      OR: [{ isRelevant: null }, { isRelevant: true, finalScore: null }],
    });
  });
});
