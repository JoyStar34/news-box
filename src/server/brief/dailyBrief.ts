import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/server/config/env";

export async function buildDailyBrief() {
  const env = getEnv();
  const top = await prisma.article.findMany({
    orderBy: [{ score: "desc" }, { fetchedAt: "desc" }],
    take: 3,
    include: { source: true },
  });

  if (top.length === 0) {
    return {
      title: "Today in Science",
      text: "暂无可用新闻数据，请先触发抓取任务。",
      items: [],
    };
  }

  if (!env.OPENAI_API_KEY) {
    return {
      title: "Today in Science",
      text: top.map((item, idx) => `${idx + 1}. ${item.title}`).join("\n"),
      items: top,
    };
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const listText = top
    .map((item, idx) => `${idx + 1}. ${item.title} (${item.source.name})`)
    .join("\n");

  const completion = await openai.responses.create({
    model: env.OPENAI_MODEL,
    temperature: 0.2,
    input: `Summarize these 3 scientific breakthroughs into a short daily brief (3 sentences, Chinese).\n${listText}`,
  });

  return {
    title: "Today in Science",
    text: completion.output_text || listText,
    items: top,
  };
}

