import assert from "node:assert/strict";
import { parseRelevance } from "./rankingPipeline";

const cases: Array<{ input: string; expected: boolean | null }> = [
  { input: "RELEVANT", expected: true },
  { input: "This article is relevant.", expected: true },
  { input: "NOT_RELEVANT", expected: false },
  { input: "NOT RELEVANT", expected: false },
  { input: "not-relevant", expected: false },
  { input: "This article is NOT RELEVANT.", expected: false },
  { input: "IRRELEVANT", expected: false },
  { input: "unrelated", expected: false },
  { input: "MAYBE", expected: null },
];

for (const testCase of cases) {
  assert.equal(parseRelevance(testCase.input), testCase.expected, testCase.input);
}

console.log("parseRelevance regression cases passed");
