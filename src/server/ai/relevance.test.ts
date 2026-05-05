import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRelevance } from "./relevance";

describe("parseRelevance", () => {
  it("accepts exact relevant responses", () => {
    assert.equal(parseRelevance("RELEVANT"), true);
    assert.equal(parseRelevance(" relevant "), true);
  });

  it("rejects common negative relevance responses", () => {
    assert.equal(parseRelevance("NOT_RELEVANT"), false);
    assert.equal(parseRelevance("NOT RELEVANT"), false);
    assert.equal(parseRelevance("not really relevant"), false);
    assert.equal(parseRelevance("IRRELEVANT"), false);
  });

  it("leaves ambiguous responses unparsed", () => {
    assert.equal(parseRelevance("unclear from the supplied summary"), null);
    assert.equal(parseRelevance("maybe"), null);
  });
});
