/** Markers embedded in `DailyBrief.body` (no DB migration). */
export const OPPORTUNITY_JSON_START = "[[OPPORTUNITY_JSON]]";
export const OPPORTUNITY_JSON_END = "[[/OPPORTUNITY_JSON]]";

/**
 * Returns a plain-text summary from `DailyBrief.body`: strips embedded opportunity JSON
 * and common LLM section noise. Does not use `JSON.parse` — safe for polluted payloads.
 */
export function stripOpportunityJson(body: string | null | undefined): string {
  if (body == null) return "";

  let s = String(body).replace(/\r\n/g, "\n");

  // Drop everything from the first opportunity marker (handles multiple blocks / garbage after).
  const firstStart = s.indexOf(OPPORTUNITY_JSON_START);
  if (firstStart !== -1) {
    s = s.slice(0, firstStart);
  }

  // Orphan closing tags (e.g. truncated payloads).
  s = s.split(OPPORTUNITY_JSON_END).join("");

  s = stripBriefPollution(s);

  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/** Regex-only cleanup; avoids touching normal numbered summary lines when possible. */
function stripBriefPollution(text: string): string {
  let s = text;

  // Inline " + … +" style dumps often seen after a list item title.
  s = s.replace(/\s*\+\s*为什么现在重要\s*/g, " ");
  s = s.replace(/\s*\+\s*为什么重要\s*/g, " ");
  s = s.replace(/\s*\+\s*行动建议\s*/g, " ");
  s = s.replace(/\s*\+\s*机会分[：:]\s*\d{1,3}\s*\/\s*100\s*/gi, " ");

  // Whole-line section headers / score lines.
  s = s.replace(/^\s*为什么现在重要[^\n]*/gmu, "");
  s = s.replace(/^\s*行动建议[^\n]*/gmu, "");
  s = s.replace(/^\s*机会分[：:]\s*\d{1,3}\s*\/\s*100\s*$/gimu, "");

  // Residual labels (goal 3).
  s = s.replace(/为什么现在重要[：:]?/g, "");
  s = s.replace(/行动建议[：:]?/g, "");
  s = s.replace(/机会分[：:]\s*\d{1,3}\s*\/\s*100/gi, "");

  return s.replace(/[ \t]+\n/g, "\n").trim();
}
