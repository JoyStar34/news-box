import assert from "node:assert/strict";
import test from "node:test";
import { parseImportance, parseRelevance } from "./scoreParsing";

test("parseRelevance handles exact and common negative variants", () => {
  assert.equal(parseRelevance("RELEVANT"), true);
  assert.equal(parseRelevance("This is relevant."), true);
  assert.equal(parseRelevance("NOT_RELEVANT"), false);
  assert.equal(parseRelevance("NOT RELEVANT"), false);
  assert.equal(parseRelevance("This is not relevant."), false);
  assert.equal(parseRelevance("IRRELEVANT"), false);
  assert.equal(parseRelevance("unclear"), null);
});

test("parseImportance accepts only one unambiguous score from 0 to 100", () => {
  assert.equal(parseImportance("85"), 85);
  assert.equal(parseImportance("Score: 85."), 85);
  assert.equal(parseImportance("0"), 0);
  assert.equal(parseImportance("100"), 100);
  assert.equal(parseImportance("101"), null);
  assert.equal(parseImportance("90-100: Major. Score: 85."), null);
  assert.equal(parseImportance("85/100"), null);
  assert.equal(parseImportance("high"), null);
});
