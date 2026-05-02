import type { TopBriefArticle } from "@/server/brief/dailyBriefService";

function hasOpportunityData(article: TopBriefArticle): boolean {
  return (
    article.opportunityScore != null ||
    Boolean(article.opportunitySummary?.trim()) ||
    (article.actionIdeas != null && article.actionIdeas.length > 0)
  );
}

/**
 * Paid-only UI gate: set NEXT_PUBLIC_PAID_ACCESS=true to preview the opportunity layer.
 * Free tier: renders nothing (data may still exist in API responses for integration testing).
 */
export function TopOpportunitySection({ article }: { article: TopBriefArticle }) {
  const paidAccess = process.env.NEXT_PUBLIC_PAID_ACCESS === "true";
  if (!paidAccess || !hasOpportunityData(article)) return null;

  const score = article.opportunityScore;

  return (
    <details className="mt-3 rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-sm">
      <summary className="cursor-pointer select-none font-medium text-violet-900">机会分析</summary>
      <div className="mt-3 space-y-2 border-t border-violet-100 pt-3 text-zinc-800">
        {score != null ? (
          <p className="text-xs text-zinc-600">
            机会指数：<span className="font-semibold text-violet-900">{score}</span> / 5
          </p>
        ) : null}
        {article.opportunitySummary?.trim() ? (
          <p className="leading-relaxed">{article.opportunitySummary.trim()}</p>
        ) : null}
        {article.actionIdeas && article.actionIdeas.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed">
            {article.actionIdeas.map((idea, i) => (
              <li key={i}>{idea}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
