import type { TopBriefArticle } from "@/server/brief/dailyBriefService";

function hasOpportunityData(article: TopBriefArticle): boolean {
  return (
    article.opportunityScore != null ||
    Boolean(article.opportunitySummary?.trim()) ||
    (article.actionIdeas != null && article.actionIdeas.length > 0)
  );
}

export function TopOpportunitySection({ article }: { article: TopBriefArticle }) {
  const paidAccess = process.env.NEXT_PUBLIC_PAID_ACCESS === "true";
  const hasData = hasOpportunityData(article);

  if (!paidAccess) {
    return (
      <div className="mt-4 border-t border-zinc-200 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Pro radar layer</p>
            <p className="mt-1 text-sm font-medium text-zinc-950">解锁机会指数、可执行动作和适合人群判断</p>
          </div>
          <a
            href="mailto:hello@newsbox.ai?subject=申请开通 AI 机会雷达 Pro"
            className="inline-flex items-center justify-center rounded-md border border-zinc-950 bg-zinc-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
          >
            申请 Pro
          </a>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-zinc-600 sm:grid-cols-3">
          <span className="border-l border-emerald-500 pl-2">机会评分</span>
          <span className="border-l border-sky-500 pl-2">一周内动作</span>
          <span className="border-l border-amber-500 pl-2">商业化窗口</span>
        </div>
      </div>
    );
  }

  if (!hasData) return null;

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-semibold text-white">
          机会指数 {article.opportunityScore ?? "待评估"}/5
        </span>
        <span className="text-xs font-medium text-zinc-500">Pro 已解锁</span>
      </div>
      {article.opportunitySummary?.trim() ? (
        <p className="mt-3 text-sm leading-6 text-zinc-800">{article.opportunitySummary.trim()}</p>
      ) : null}
      {article.actionIdeas && article.actionIdeas.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-700">
          {article.actionIdeas.map((idea, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
              <span>{idea}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
