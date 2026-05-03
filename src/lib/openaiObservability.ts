/** Latency + token logs for OpenAI Responses API (also works with OpenRouter-style proxies). */

export type OpenAiLatencyTag =
  | "[SCORE]"
  | "[SUMMARIZE]"
  | "[DAILY_TOP]"
  | "[OPPORTUNITY_LAYER]"
  | "[DAILY_BRIEF_FLASH]"
  | (string & {});

type UsageLike = {
  prompt_tokens?: number;
  completion_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
};

export function logOpenAiLatency(tag: OpenAiLatencyTag, startMs: number) {
  console.log(`${tag} openai_latency_ms=`, Date.now() - startMs);
}

export function logOpenAiUsage(response: { usage?: unknown }) {
  const u = response.usage as UsageLike | undefined | null;
  if (!u) {
    console.log("[OPENAI]", "usage=unavailable");
    return;
  }
  const prompt = u.prompt_tokens ?? u.input_tokens;
  const completion = u.completion_tokens ?? u.output_tokens;
  console.log("[OPENAI]", "prompt_tokens=", prompt, "completion_tokens=", completion);
}
