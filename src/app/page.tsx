import Link from "next/link";
import { Category } from "@prisma/client";
import { GenerateTodayButton } from "@/components/GenerateTodayButton";
import { TopOpportunitySection } from "@/components/TopOpportunitySection";
import { DISPLAY_SUMMARY_FALLBACK, DISPLAY_WHY_FALLBACK } from "@/lib/articleDisplayDefaults";
import { getTimeLabel } from "@/lib/articleTimeLabels";
import { buildDailyBriefFromStore } from "@/server/brief/dailyBriefService";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function formatDate(date: Date | null): string {
  if (!date) return "未知时间";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function categoryLabel(category: Category): string {
  const labels: Record<Category, string> = {
    AI: "AI",
    TECH: "科技",
    SCIENCE: "科学",
    ASTRONOMY: "天文",
    PAPER: "论文",
  };
  return labels[category] ?? category;
}

export default async function Home() {
  const brief = await buildDailyBriefFromStore();
  const top3 = brief.items.slice(0, 3);
  const generatedAt = brief.meta.generatedAt
    ? new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(brief.meta.generatedAt))
    : null;

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-zinc-950">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-zinc-200 pb-5">
          <Link href="/" className="text-sm font-semibold tracking-[0.16em] text-zinc-900">
            AI 机会雷达
          </Link>
          <span className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            PMF 验证版
          </span>
        </header>

        <section className="py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            today&apos;s ai opportunity top 3
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-zinc-950 sm:text-5xl">
            今天只看 3 条最值得行动的 AI 机会
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600">
            系统抓取当天所有新闻，由 AI 按影响力、可行动性、变化性和时效性评分，最终只留下 Top 3。
          </p>
        </section>

        <section className="pb-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">{brief.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">输出结构：title / whyImportant / opportunityScore / actionIdea</p>
              {generatedAt ? (
                <p className="mt-2 text-xs text-zinc-500">
                  生成时间：{generatedAt} · prompt：{brief.meta.promptHash ?? "unknown"}
                </p>
              ) : null}
            </div>
            <GenerateTodayButton />
          </div>

          {top3.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-zinc-600">今天还没有可展示的机会。请先运行当天新闻抓取和 Top3 评分任务。</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {top3.map((article, index) => (
                <article key={article.id} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-zinc-950 px-2 py-1 text-xs font-semibold text-white">#{index + 1}</span>
                    <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">{getTimeLabel(article)}</span>
                    <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                      {categoryLabel(article.category)}
                    </span>
                  </div>

                  <p className="mt-4 text-xs text-zinc-500">
                    {article.source.name} · {formatDate(article.publishedAt ?? article.fetchedAt)}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold leading-8">{article.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-700">
                    {article.summaryAi?.trim() || article.summaryRaw?.trim() || DISPLAY_SUMMARY_FALLBACK}
                  </p>
                  <p className="mt-4 border-l-2 border-emerald-600 pl-3 text-sm leading-6 text-zinc-800">
                    {article.whyImportant?.trim() || DISPLAY_WHY_FALLBACK}
                  </p>
                  <TopOpportunitySection article={article} />
                  <Link className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-900" href={article.url} target="_blank">
                    查看原文
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
