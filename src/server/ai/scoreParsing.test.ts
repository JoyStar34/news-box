import assert from "node:assert/strict";
import test from "node:test";
import { parseImportance, parseRelevance } from "@/server/ai/scoreParsing";
import { SCORING_QUEUE_WHERE } from "@/server/ai/rankingPipeline";

test("parseRelevance handles negative labels without treating them as relevant", () => {
  assert.equal(parseRelevance("NOT_RELEVANT"), false);
  assert.equal(parseRelevance("NOT RELEVANT"), false);
  assert.equal(parseRelevance("irrelevant"), false);
});

test("parseRelevance keeps unknown labels retryable", () => {
  assert.equal(parseRelevance("unclear"), null);
  assert.equal(parseRelevance(""), null);
});

test("parseRelevance accepts positive relevance labels", () => {
  assert.equal(parseRelevance("RELEVANT"), true);
  assert.equal(parseRelevance("Relevant."), true);
});

test("parseImportance accepts only scores in range", () => {
  assert.equal(parseImportance("Score: 87"), 87);
  assert.equal(parseImportance("101"), null);
  assert.equal(parseImportance("no score"), null);
});

test("scoring queue includes new rows and relevant rows missing final scores", () => {
  assert.deepEqual(SCORING_QUEUE_WHERE, {
    OR: [{ isRelevant: null }, { isRelevant: true, finalScore: null }],
  });
});
