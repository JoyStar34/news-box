import Link from "next/link";
import { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildDailyBrief } from "@/server/brief/dailyBrief";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

const categoryOptions: Array<{ label: string; value: "ALL" | Category }> = [
  { label: "全部", value: "ALL" },
  { label: "AI", value: Category.AI },
  { label: "科技", value: Category.TECH },
  { label: "科学", value: Category.SCIENCE },
  { label: "天文", value: Category.ASTRONOMY },
  { label: "论文", value: Category.PAPER },
];

function formatDate(date: Date | null): string {
  if (!date) return "未知时间";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildPageHref(page: number, category: string | undefined) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (category) params.set("category", category);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function buildCategoryHref(category: string) {
  if (category === "ALL") return "/";
  return `/?category=${category}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const categoryParam = params.category;
  const pageParam = Number(params.page ?? "1");
  const page = Number.isFinite(pageParam) ? Math.max(1, pageParam) : 1;

  const where =
    categoryParam && Object.values(Category).includes(categoryParam as Category)
      ? { category: categoryParam as Category }
      : {};

  const [top, total, brief] = await Promise.all([
    prisma.article.findMany({
      include: { source: true },
      orderBy: [{ score: "desc" }, { fetchedAt: "desc" }],
      take: 3,
    }),
    prisma.article.count({ where }),
    buildDailyBrief(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const latest = await prisma.article.findMany({
    where,
    include: { source: true },
    orderBy: { fetchedAt: "desc" },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const hasPrev = safePage > 1;
  const hasNext = safePage < totalPages;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">News Box</h1>
        <p className="mt-2 text-sm text-zinc-600">
          全球科技、AI、科学与天文学新闻聚合，自动生成摘要和每日重点。
        </p>
      </header>

      <section className="mb-10 rounded-xl border p-6">
        <h2 className="text-xl font-semibold">Today in Science</h2>
        <p className="mt-3 whitespace-pre-line text-sm text-zinc-700">{brief.text}</p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">今日 3 条最重要突破</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {top.map((article) => (
            <article key={article.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-zinc-500">
                {article.source.name} · {article.category} · {formatDate(article.publishedAt)}
              </p>
              <h3 className="mt-2 font-semibold leading-6">{article.title}</h3>
              <p className="mt-2 line-clamp-5 text-sm text-zinc-700">{article.summaryAi ?? article.summaryRaw ?? "暂无摘要"}</p>
              {article.whyImportant ? (
                <p className="mt-2 rounded-lg bg-zinc-100 p-2 text-xs text-zinc-700">为什么重要：{article.whyImportant}</p>
              ) : null}
              <Link className="mt-3 inline-block text-sm text-blue-600 hover:underline" href={article.url} target="_blank">
                阅读原文
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">最新新闻</h2>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((option) => {
              const active = (option.value === "ALL" && !categoryParam) || option.value === categoryParam;
              return (
                <Link
                  key={option.value}
                  href={buildCategoryHref(option.value)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
          {latest.map((article) => (
            <article key={article.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-zinc-500">
                {article.source.name} · {article.category} · {formatDate(article.publishedAt ?? article.fetchedAt)}
              </p>
              <h3 className="mt-1 font-semibold">{article.title}</h3>
              <p className="mt-2 line-clamp-4 text-sm text-zinc-700">{article.summaryAi ?? article.summaryRaw ?? "暂无摘要"}</p>
              {article.whyImportant ? (
                <p className="mt-2 rounded-lg bg-zinc-100 p-2 text-xs text-zinc-700">为什么重要：{article.whyImportant}</p>
              ) : null}
              <Link className="mt-2 inline-block text-sm text-blue-600 hover:underline" href={article.url} target="_blank">
                原文链接
              </Link>
            </article>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-zinc-600">
            第 {safePage} / {totalPages} 页，共 {total} 条
          </p>
          <div className="flex gap-2">
            <Link
              href={buildPageHref(Math.max(1, safePage - 1), categoryParam)}
              className={`rounded-lg border px-3 py-1 text-sm ${hasPrev ? "hover:bg-zinc-100" : "pointer-events-none opacity-40"}`}
            >
              上一页
            </Link>
            <Link
              href={buildPageHref(safePage + 1, categoryParam)}
              className={`rounded-lg border px-3 py-1 text-sm ${hasNext ? "hover:bg-zinc-100" : "pointer-events-none opacity-40"}`}
            >
              下一页
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
