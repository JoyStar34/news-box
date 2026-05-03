import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRelevance } from "./relevance";

describe("parseRelevance", () => {
  it("parses positive model responses", () => {
    assert.equal(parseRelevance("RELEVANT"), true);
    assert.equal(parseRelevance("Relevant."), true);
  });

  it("parses negative model responses with common separators", () => {
    assert.equal(parseRelevance("NOT_RELEVANT"), false);
    assert.equal(parseRelevance("NOT RELEVANT"), false);
    assert.equal(parseRelevance("not-relevant"), false);
    assert.equal(parseRelevance("This article is not relevant."), false);
  });

  it("does not classify unrelated output", () => {
    assert.equal(parseRelevance("I cannot determine this from the provided text."), null);
  });
});
