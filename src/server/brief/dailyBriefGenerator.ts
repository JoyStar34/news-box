import type OpenAI from "openai";
import { logOpenAiLatency, logOpenAiUsage } from "@/lib/openaiObservability";

export type DailyBriefTopArticleInput = {
  title: string;
  summaryAi: string | null | undefined;
};

const BANNED = /为什么重要|行动建议|机会分/;

/** One CJK/Latin char ≈ one slot for the 40 字 cap. */
function clipToMaxChars(s: string, max: number): string {
  const chars = Array.from(s.trim());
  if (chars.length <= max) return chars.join("");
  return `${chars.slice(0, max - 1).join("")}…`;
}

function fallbackBody(articles: DailyBriefTopArticleInput[]): string {
  return articles
    .map((a, i) => `${i + 1}. ${clipToMaxChars(a.title?.trim() || "（无标题）", 40)}`)
    .join("\n");
}

function sanitizeLine(line: string, maxChars: number): string {
  let s = line.replace(/^\d+[\).\、．]\s*/, "").trim();
  if (BANNED.test(s)) return "";
  return clipToMaxChars(s, maxChars);
}

/**
 * 二次 AI 总结：把 Top3 的标题 + summaryAi 压成 3 条一句话快讯（写入 `DailyBrief.body` 前半段，不含机会层 JSON）。
 * 由 `dailyTopJob` 在落库前调用；`dailyBriefService` 只读 `body`。
 */
export async function generateDailyBrief(
  openai: OpenAI,
  model: string,
  top3Articles: DailyBriefTopArticleInput[],
): Promise<string> {
  const n = top3Articles.length;
  if (n === 0) return "";

  const blocks = top3Articles.map((a, i) => {
    const title = (a.title ?? "").trim() || "（无标题）";
    const sum = (a.summaryAi ?? "").trim();
    return `${i + 1}. 标题：${title}\n${sum ? `   摘要：${sum}` : "   摘要：（无，请仅依据标题提炼一条快讯要点）"}`;
  });

  const prompt = `请将以下${n}条科技新闻压缩为${n}条一句话快讯，每条不超过40字。

硬性要求：
- 逐行输出，共${n}行；每行必须以「数字 + 英文句点 + 空格」开头，例如：1. 、2. 、3. 
- 每行「句点之后」的正文不超过40个汉字或字符；风格像新闻快报，信息密度高，只保留最重要信息。
- 正文不要重复或复述该行「标题」里的原话；读者只看正文应能抓住要点。
- 只用中文；不要输出任何前言、后记、markdown、代码块。
- 严禁出现这些词或相近表述：为什么重要、行动建议、机会分。

输入材料：
${blocks.join("\n\n")}`;

  const start = Date.now();
  const completion = await openai.responses.create({
    model,
    temperature: 0.25,
    input: prompt,
  });
  logOpenAiLatency("[DAILY_BRIEF_FLASH]", start);
  logOpenAiUsage(completion);

  const raw = (completion.output_text ?? "").trim();
  if (!raw) return fallbackBody(top3Articles);

  const maxChars = 40;
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, n);

  const cleaned: string[] = [];
  for (let i = 0; i < n; i++) {
    const line = lines[i] ?? "";
    const body = sanitizeLine(line, maxChars);
    const title = (top3Articles[i]?.title ?? "").trim();
    const finalBody = body || clipToMaxChars(title, maxChars);
    cleaned.push(`${i + 1}. ${finalBody}`);
  }

  return cleaned.join("\n");
}
