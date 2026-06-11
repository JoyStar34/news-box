import assert from "node:assert/strict";
import { test } from "node:test";

import { parseImportance, parseRelevance } from "@/server/ai/rankingPipeline";

test("parseRelevance handles explicit positive and negative responses", () => {
  assert.equal(parseRelevance("RELEVANT"), true);
  assert.equal(parseRelevance("This article is relevant."), true);
  assert.equal(parseRelevance("NOT_RELEVANT"), false);
  assert.equal(parseRelevance("NOT RELEVANT"), false);
  assert.equal(parseRelevance("not-relevant"), false);
  assert.equal(parseRelevance("IRRELEVANT"), false);
  assert.equal(parseRelevance("This is not relevant to the target topics."), false);
});

test("parseRelevance leaves ambiguous responses retryable", () => {
  assert.equal(parseRelevance(""), null);
  assert.equal(parseRelevance("maybe"), null);
  assert.equal(parseRelevance("unable to determine"), null);
});

test("parseImportance accepts only scores within the expected range", () => {
  assert.equal(parseImportance("87"), 87);
  assert.equal(parseImportance("score: 100"), 100);
  assert.equal(parseImportance("-1"), null);
  assert.equal(parseImportance("101"), null);
  assert.equal(parseImportance("no score"), null);
});
