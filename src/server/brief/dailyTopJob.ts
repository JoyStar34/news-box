import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/server/config/env";
import type { Article, Source } from "@prisma/client";

const HOURS_48_MS = 48 * 60 * 60 * 1000;

function utcDayStart(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function normalizeTitle(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Pick top 3 for the day: take top 10 by final_score → LLM picks best 3 titles →
 * persist DailyBrief + DailyBriefItem. Falls back to score order if LLM matching fails.
 */
export async function generateDailyTopNews(): Promise<{
  ok: boolean;
  briefDate: string;
  articleIds: string[];
  reason?: string;
}> {
  const env = getEnv();
  const now = new Date();
  const cutoff = new Date(now.getTime() - HOURS_48_MS);
  const day = utcDayStart(now);

  type WithSource = Article & { source: Source };
  const candidates: WithSource[] = await prisma.article.findMany({
    where: {
      isRelevant: true,
      finalScore: { not: null },
      fetchedAt: { gte: cutoff },
    },
    orderBy: { finalScore: "desc" },
    take: 10,
    include: { source: true },
  });

  if (candidates.length === 0) {
    return { ok: false, briefDate: day.toISOString(), articleIds: [], reason: "no_candidates" };
  }

  const fallbackTop3: WithSource[] = candidates.slice(0, 3);

  let chosen: WithSource[] = fallbackTop3;

  if (env.OPENAI_API_KEY && candidates.length >= 1) {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
    const list = candidates.map((a, i) => `${i + 1}. ${a.title} (${a.source.name})`).join("\n");
    const pickPrompt = `From these ${candidates.length} AI/science news articles, select the 3 most important stories today.

Return exactly 3 lines. Each line must be ONLY the article title, copied verbatim from the list below (no numbering, no source name).

${list}`;

    try {
      const completion = await openai.responses.create({
        model: env.OPENAI_MODEL,
        temperature: 0.2,
        input: pickPrompt,
      });
      const raw = (completion.output_text ?? "").trim();
      const lines = raw
        .split("\n")
        .map((l) => l.replace(/^\d+[\).\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 3);

      const matched: WithSource[] = [];
      for (const line of lines) {
        const target = normalizeTitle(line);
        let found =
          candidates.find((a) => normalizeTitle(a.title) === target) ??
          candidates.find((a) => normalizeTitle(a.title).includes(target) || target.includes(normalizeTitle(a.title)));
        if (!found && line.length > 10) {
          found = candidates.find((a) => a.title.includes(line.slice(0, 40)) || line.includes(a.title.slice(0, 40)));
        }
        if (found && !matched.some((m) => m.id === found!.id)) {
          matched.push(found);
        }
      }

      if (matched.length >= 3) {
        chosen = matched.slice(0, 3);
      } else if (matched.length > 0) {
        const rest = fallbackTop3.filter((a) => !matched.some((m) => m.id === a.id));
        chosen = [...matched, ...rest].slice(0, 3);
      }
    } catch {
      chosen = fallbackTop3;
    }
  }

  let body = chosen.map((a, i) => `${i + 1}. ${a.title}`).join("\n");
  if (env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
    const listText = chosen.map((a, i) => `${i + 1}. ${a.title} (${a.source.name})`).join("\n");
    try {
      const completion = await openai.responses.create({
        model: env.OPENAI_MODEL,
        temperature: 0.2,
        input: `Summarize these 3 scientific breakthroughs into a short daily brief (3 sentences, Chinese).\n${listText}`,
      });
      body = completion.output_text?.trim() || body;
    } catch {
      // keep body as title list
    }
  }

  await prisma.$transaction(async (tx) => {
    const brief = await tx.dailyBrief.upsert({
      where: { briefDate: day },
      create: {
        briefDate: day,
        body,
      },
      update: {
        body,
      },
    });

    await tx.dailyBriefItem.deleteMany({ where: { briefId: brief.id } });

    await tx.dailyBriefItem.createMany({
      data: chosen.map((a, idx) => ({
        briefId: brief.id,
        articleId: a.id,
        position: idx + 1,
      })),
    });
  });

  return {
    ok: true,
    briefDate: day.toISOString(),
    articleIds: chosen.map((a) => a.id),
  };
}
