import type { TopBriefArticle } from "@/server/brief/dailyBriefService";

export function TopOpportunitySection({ article }: { article: TopBriefArticle }) {
  if (article.opportunityScore == null || !article.actionIdea?.trim()) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-semibold text-white">
          机会分 {article.opportunityScore}/100
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-800">
        行动建议：{article.actionIdea.trim()}
      </p>
    </div>
  );
}
