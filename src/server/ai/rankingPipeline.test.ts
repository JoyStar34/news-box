import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseImportance, parseRelevance } from "./rankingPipeline";

describe("parseRelevance", () => {
  it("recognizes common negative relevance responses before positive tokens", () => {
    for (const response of [
      "NOT_RELEVANT",
      "NOT RELEVANT",
      "Not relevant.",
      "This is not relevant",
      "IRRELEVANT",
    ]) {
      assert.equal(parseRelevance(response), false, response);
    }
  });

  it("recognizes positive relevance responses", () => {
    for (const response of ["RELEVANT", "Relevant.", "This article is relevant"]) {
      assert.equal(parseRelevance(response), true, response);
    }
  });

  it("leaves ambiguous relevance responses retryable", () => {
    for (const response of ["", "MAYBE", "unknown"]) {
      assert.equal(parseRelevance(response), null, response);
    }
  });
});

describe("parseImportance", () => {
  it("parses bounded integer scores", () => {
    assert.equal(parseImportance("87"), 87);
    assert.equal(parseImportance("Score: 100"), 100);
    assert.equal(parseImportance("101"), null);
    assert.equal(parseImportance("High"), null);
  });
});
