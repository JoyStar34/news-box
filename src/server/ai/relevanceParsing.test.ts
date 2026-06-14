import assert from "node:assert/strict";
import test from "node:test";
import { parseRelevance } from "./relevanceParsing";

test("parseRelevance treats explicit negative verdicts as irrelevant", () => {
  assert.equal(parseRelevance("NOT_RELEVANT"), false);
  assert.equal(parseRelevance("NOT RELEVANT"), false);
  assert.equal(parseRelevance("not-relevant"), false);
  assert.equal(parseRelevance("irrelevant"), false);
});

test("parseRelevance treats explicit positive verdicts as relevant", () => {
  assert.equal(parseRelevance("RELEVANT"), true);
  assert.equal(parseRelevance("Relevant."), true);
});

test("parseRelevance leaves ambiguous responses retryable", () => {
  assert.equal(parseRelevance("maybe"), null);
  assert.equal(parseRelevance(""), null);
});
