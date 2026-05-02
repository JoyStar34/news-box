import { z } from "zod";

export type ArticleOpportunityFields = {
  opportunityScore?: number;
  actionIdea?: string;
};

export type OpportunityMeta = {
  generatedAt?: string;
  promptHash?: string;
};

const OP_START = "[[OPPORTUNITY_JSON]]";
const OP_END = "[[/OPPORTUNITY_JSON]]";

const oneArticleSchema = z.object({
  whyImportant: z.string(),
  opportunityScore: z.number(),
  actionIdea: z.string(),
});

const bundleSchema = z.object({
  generatedAt: z.string().optional(),
  promptHash: z.string().optional(),
  byArticleId: z.record(z.string(), oneArticleSchema),
});

export function stripOpportunityFromBody(body: string): string {
  const i = body.indexOf(OP_START);
  if (i === -1) return body.trimEnd();
  return body.slice(0, i).trimEnd();
}

export function parseOpportunityFromBody(body: string | null | undefined): Record<string, ArticleOpportunityFields> {
  if (!body) return {};
  const i = body.indexOf(OP_START);
  const j = body.indexOf(OP_END);
  if (i === -1 || j === -1 || j <= i) return {};

  try {
    const raw = JSON.parse(body.slice(i + OP_START.length, j).trim()) as unknown;
    const parsed = bundleSchema.safeParse(raw);
    if (!parsed.success) return {};

    const out: Record<string, ArticleOpportunityFields> = {};
    for (const [id, val] of Object.entries(parsed.data.byArticleId)) {
      out[id] = {
        opportunityScore: Math.round(Math.min(100, Math.max(0, val.opportunityScore))),
        actionIdea: val.actionIdea.trim(),
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function parseOpportunityMetaFromBody(body: string | null | undefined): OpportunityMeta {
  if (!body) return {};
  const i = body.indexOf(OP_START);
  const j = body.indexOf(OP_END);
  if (i === -1 || j === -1 || j <= i) return {};

  try {
    const raw = JSON.parse(body.slice(i + OP_START.length, j).trim()) as unknown;
    const parsed = bundleSchema.safeParse(raw);
    if (!parsed.success) return {};
    return {
      generatedAt: parsed.data.generatedAt,
      promptHash: parsed.data.promptHash,
    };
  } catch {
    return {};
  }
}

export function appendOpportunityJson(
  body: string,
  byArticleId: Record<string, { whyImportant: string; opportunityScore: number; actionIdea: string }>,
  meta: OpportunityMeta = {},
): string {
  const base = stripOpportunityFromBody(body);
  return `${base.trimEnd()}\n\n${OP_START}\n${JSON.stringify({ v: 1, ...meta, byArticleId })}\n${OP_END}`;
}

export function mergeOpportunityIntoArticles<T extends { id: string }>(
  items: T[],
  briefBody: string | null | undefined,
): (T & ArticleOpportunityFields)[] {
  const map = parseOpportunityFromBody(briefBody ?? undefined);
  return items.map((item) => ({
    ...item,
    ...(map[item.id] ?? {}),
  }));
}
