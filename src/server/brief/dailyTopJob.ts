import OpenAI from "openai";
import { subDays, subHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { logOpenAiLatency, logOpenAiUsage } from "@/lib/openaiObservability";
import { getEnv } from "@/server/config/env";
import type { Article, Source } from "@prisma/client";

function utcDayStart(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function normalizeTitle(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Pick top 3: pool by publishedAt (36h) / fetchedAt when unpublished (24h) →
 * demote recent DailyBrief picks → top 10 by adjusted score → LLM picks 3 → persist.
 */
export async function generateDailyTopNews(): Promise<{
  ok: boolean;
  briefDate: string;
  articleIds: string[];
  reason?: string;
}> {
  const env = getEnv();
  const now = new Date();
  const day = utcDayStart(now);
  const cutoff36 = subHours(now, 36);
  const cutoff24 = subHours(now, 24);

  type WithSource = Article & { source: Source };

  const pool = await prisma.article.findMany({
    where: {
      isRelevant: true,
      finalScore: { not: null },
      OR: [
        { publishedAt: { gte: cutoff36 } },
        {
          AND: [{ publishedAt: null }, { fetchedAt: { gte: cutoff24 } }],
        },
      ],
    },
    orderBy: { finalScore: "desc" },
    take: 80,
    include: { source: true },
  });

  const recentBriefs = await prisma.dailyBrief.findMany({
    where: {
      briefDate: { gte: utcDayStart(subDays(now, 2)) },
    },
    include: { items: true },
  });

  const recentArticleIds = new Set(recentBriefs.flatMap((b) => b.items.map((i) => i.articleId)));

  type WithAdj = WithSource & { adjustedScore: number };
  const ranked: WithAdj[] = pool.map((article) => {
    let score = article.finalScore ?? 0;
    if (recentArticleIds.has(article.id)) {
      score *= 0.7;
    }
    return { ...article, adjustedScore: score };
  });

  ranked.sort((a, b) => {
    if (b.adjustedScore !== a.adjustedScore) return b.adjustedScore - a.adjustedScore;
    return b.fetchedAt.getTime() - a.fetchedAt.getTime();
  });

  const stripAdj = (a: WithAdj): WithSource => {
    const { adjustedScore: _, ...rest } = a;
    return rest;
  };

  const candidates: WithSource[] = ranked.slice(0, 10).map(stripAdj);
  const fallbackTop3: WithSource[] = ranked.slice(0, 3).map(stripAdj);

  console.log(`[DAILY_TOP] candidates=${candidates.length} pool=${pool.length}`);

  if (candidates.length === 0) {
    return { ok: false, briefDate: day.toISOString(), articleIds: [], reason: "no_candidates" };
  }

  let chosen: WithSource[] = fallbackTop3;

  if (env.OPENAI_API_KEY && candidates.length >= 1) {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
    const list = candidates.map((a, i) => `${i + 1}. ${a.title} (${a.source.name})`).join("\n");
    const pickPrompt = `From these ${candidates.length} AI/science news articles (focused on roughly the last 24–36 hours), select the 3 most important stories.

Return exactly 3 lines. Each line must be ONLY the article title, copied verbatim from the list below (no numbering, no source name).

${list}`;

    try {
      const startPick = Date.now();
      const completion = await openai.responses.create({
        model: env.OPENAI_MODEL,
        temperature: 0.2,
        input: pickPrompt,
      });
      logOpenAiLatency("[DAILY_TOP]", startPick);
      logOpenAiUsage(completion);
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
    } catch (err) {
      console.error(`[ERROR][DAILY_TOP]`, err);
      chosen = fallbackTop3;
    }
  }

  console.log(`[DAILY_TOP] selected=[${chosen.map((a) => a.id).join(",")}]`);

  let body = chosen.map((a, i) => `${i + 1}. ${a.title}`).join("\n");
  if (env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
    const listText = chosen.map((a, i) => `${i + 1}. ${a.title} (${a.source.name})`).join("\n");
    try {
      const startBrief = Date.now();
      const completion = await openai.responses.create({
        model: env.OPENAI_MODEL,
        temperature: 0.2,
        input: `Summarize these 3 scientific breakthroughs into a short daily brief (3 sentences, Chinese).\n${listText}`,
      });
      logOpenAiLatency("[DAILY_TOP]", startBrief);
      logOpenAiUsage(completion);
      body = completion.output_text?.trim() || body;
    } catch (err) {
      console.error(`[ERROR][DAILY_TOP]`, err);
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

  console.log(`[DAILY_TOP] daily brief generated`);

  return {
    ok: true,
    briefDate: day.toISOString(),
    articleIds: chosen.map((a) => a.id),
  };
}
