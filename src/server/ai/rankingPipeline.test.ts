import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRelevance } from "./rankingPipeline";

describe("parseRelevance", () => {
  for (const text of [
    "NOT_RELEVANT",
    "NOT RELEVANT",
    "not relevant",
    "This article is not relevant.",
    "IRRELEVANT",
  ]) {
    it(`treats negative relevance output as false: ${text}`, () => {
      assert.equal(parseRelevance(text), false);
    });
  }

  for (const text of ["RELEVANT", "Relevant.", "This article is relevant."]) {
    it(`treats positive relevance output as true: ${text}`, () => {
      assert.equal(parseRelevance(text), true);
    });
  }

  it("leaves ambiguous output unparsed", () => {
    assert.equal(parseRelevance("I cannot determine this from the summary."), null);
  });
});
