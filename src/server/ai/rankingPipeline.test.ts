import assert from "node:assert/strict";
import test from "node:test";
import { parseImportance, parseRelevance } from "./rankingPipeline";

test("parseRelevance treats explicit negative responses as irrelevant", () => {
  assert.equal(parseRelevance("NOT_RELEVANT"), false);
  assert.equal(parseRelevance("NOT RELEVANT"), false);
  assert.equal(parseRelevance("This is not relevant because it is a product deal."), false);
  assert.equal(parseRelevance("IRRELEVANT"), false);
});

test("parseRelevance accepts positive responses without matching irrelevant substrings", () => {
  assert.equal(parseRelevance("RELEVANT"), true);
  assert.equal(parseRelevance("Relevant: major science discovery"), true);
});

test("parseRelevance leaves ambiguous responses retryable", () => {
  assert.equal(parseRelevance(""), null);
  assert.equal(parseRelevance("unclear"), null);
});

test("parseImportance parses only in-range scores", () => {
  assert.equal(parseImportance("85"), 85);
  assert.equal(parseImportance("score: 101"), null);
  assert.equal(parseImportance("no numeric score"), null);
});
