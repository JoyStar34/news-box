import assert from "node:assert/strict";
import test from "node:test";
import { parseRelevance } from "./relevanceParser";

test("parseRelevance treats negative relevance responses as irrelevant", () => {
  assert.equal(parseRelevance("NOT_RELEVANT"), false);
  assert.equal(parseRelevance("NOT RELEVANT"), false);
  assert.equal(parseRelevance("not particularly relevant"), false);
  assert.equal(parseRelevance("not-relevant"), false);
  assert.equal(parseRelevance("irrelevant"), false);
});

test("parseRelevance accepts positive relevance responses", () => {
  assert.equal(parseRelevance("RELEVANT"), true);
  assert.equal(parseRelevance("This article is relevant."), true);
});

test("parseRelevance returns null for unrecognized responses", () => {
  assert.equal(parseRelevance("maybe"), null);
});
