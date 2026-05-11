import assert from "node:assert/strict";
import test from "node:test";
import { parseRelevance } from "./rankingPipeline";

test("parseRelevance recognizes relevant labels", () => {
  assert.equal(parseRelevance("RELEVANT"), true);
  assert.equal(parseRelevance("Relevant\n"), true);
  assert.equal(parseRelevance("This article is relevant."), true);
});

test("parseRelevance treats negative relevance variants as irrelevant", () => {
  assert.equal(parseRelevance("NOT_RELEVANT"), false);
  assert.equal(parseRelevance("NOT RELEVANT"), false);
  assert.equal(parseRelevance("not-relevant"), false);
  assert.equal(parseRelevance("NOTRELEVANT"), false);
  assert.equal(parseRelevance("irrelevant"), false);
  assert.equal(parseRelevance("This is not relevant."), false);
});

test("parseRelevance returns null for unrecognized labels", () => {
  assert.equal(parseRelevance("maybe"), null);
  assert.equal(parseRelevance(""), null);
});
