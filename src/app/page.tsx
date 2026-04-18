import Link from "next/link";
import { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildDailyBriefFromStore } from "@/server/brief/dailyBriefService";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
type RangeKey = "24h" | "7d" | "30d";
type SortKey = "latest" | "top";

const categoryOptions: Array<{ label: string; value: "ALL" | Category }> = [
  { label: "全部", value: "ALL" },
  { label: "AI", value: Category.AI },
  { label: "科技", value: Category.TECH },
  { label: "科学", value: Category.SCIENCE },
  { label: "天文", value: Category.ASTRONOMY },
  { label: "论文", value: Category.PAPER },
];

const rangeOptions: Array<{ label: string; value: RangeKey }> = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

const sortOptions: Array<{ label: string; value: SortKey }> = [
  { label: "最新", value: "latest" },
  { label: "最重要", value: "top" },
];

function buildRangeDate(range: string | undefined): Date | null {
  if (!range) return null;
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const map: Record<RangeKey, number> = {
    "24h": 24 * hour,
    "7d": 7 * 24 * hour,
    "30d": 30 * 24 * hour,
  };
  if (!(range in map)) return null;
  return new Date(now - map[range as RangeKey]);
}

function normalizeRange(range: string | undefined): RangeKey {
  if (range === "7d" || range === "30d") return range;
  return "24h";
}

function normalizeSort(sort: string | undefined): SortKey {
  return sort === "top" ? "top" : "latest";
}

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

function buildPageHref(
  page: number,
  category: string | undefined,
  range: string | undefined,
  sort: string | undefined,
  sourceId: string | undefined,
) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (category) params.set("category", category);
  if (range) params.set("range", range);
  if (sort) params.set("sort", sort);
  if (sourceId) params.set("source", sourceId);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function buildCategoryHref(
  category: string,
  range: string | undefined,
  sort: string | undefined,
  sourceId: string | undefined,
) {
  const params = new URLSearchParams();
  if (category !== "ALL") params.set("category", category);
  if (range) params.set("range", range);
  if (sort) params.set("sort", sort);
  if (sourceId) params.set("source", sourceId);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function buildRangeHref(range: string, category: string | undefined, sort: string | undefined, sourceId: string | undefined) {
  const params = new URLSearchParams();
  params.set("range", range);
  if (category) params.set("category", category);
  if (sort) params.set("sort", sort);
  if (sourceId) params.set("source", sourceId);
  const query = params.toString();
  return `/?${query}`;
}

function buildSortHref(sort: string, category: string | undefined, range: string | undefined, sourceId: string | undefined) {
  const params = new URLSearchParams();
  params.set("sort", sort);
  if (category) params.set("category", category);
  if (range) params.set("range", range);
  if (sourceId) params.set("source", sourceId);
  const query = params.toString();
  return `/?${query}`;
}

function buildSourceHref(
  sourceId: string,
  category: string | undefined,
  range: string | undefined,
  sort: string | undefined,
) {
  const params = new URLSearchParams();
  if (sourceId !== "ALL") params.set("source", sourceId);
  if (category) params.set("category", category);
  if (range) params.set("range", range);
  if (sort) params.set("sort", sort);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; range?: string; sort?: string; source?: string }>;
}) {
  const params = await searchParams;
  const categoryParam = params.category;
  const sourceParam = params.source;
  const effectiveRange = normalizeRange(params.range);
  const effectiveSort = normalizeSort(params.sort);
  const pageParam = Number(params.page ?? "1");
  const page = Number.isFinite(pageParam) ? Math.max(1, pageParam) : 1;
  const rangeStart = buildRangeDate(effectiveRange);

  const where: {
    category?: Category;
    sourceId?: string;
    fetchedAt?: { gte: Date };
  } =
    categoryParam && Object.values(Category).includes(categoryParam as Category)
      ? { category: categoryParam as Category }
      : {};
  if (sourceParam) {
    where.sourceId = sourceParam;
  }
  if (rangeStart) {
    where.fetchedAt = { gte: rangeStart };
  }

  const countWhere: {
    fetchedAt?: { gte: Date };
    sourceId?: string;
  } = {};
  if (rangeStart) countWhere.fetchedAt = { gte: rangeStart };
  if (sourceParam) countWhere.sourceId = sourceParam;

  const sourceCountWhere: {
    fetchedAt?: { gte: Date };
    category?: Category;
  } = {};
  if (rangeStart) sourceCountWhere.fetchedAt = { gte: rangeStart };
  if (categoryParam && Object.values(Category).includes(categoryParam as Category)) {
    sourceCountWhere.category = categoryParam as Category;
  }

  const [briefData, total, groupedCounts, sourceGrouped] = await Promise.all([
    buildDailyBriefFromStore(),
    prisma.article.count({ where }),
    prisma.article.groupBy({
      by: ["category"],
      _count: { category: true },
      where: countWhere,
    }),
    prisma.article.groupBy({
      by: ["sourceId"],
      _count: { sourceId: true },
      where: sourceCountWhere,
      orderBy: { _count: { sourceId: "desc" } },
      take: 12,
    }),
  ]);

  const top = briefData.items;
  const brief = { title: briefData.title, text: briefData.text };

  const sourceIds = sourceGrouped.map((item) => item.sourceId);
  const sourceRecords = sourceIds.length
    ? await prisma.source.findMany({
        where: { id: { in: sourceIds } },
      })
    : [];
  const sourceNameMap = new Map(sourceRecords.map((source) => [source.id, source.name]));
  const sourceOptions = [
    { id: "ALL", name: "全部来源", count: sourceGrouped.reduce((sum, item) => sum + item._count.sourceId, 0) },
    ...sourceGrouped.map((item) => ({
      id: item.sourceId,
      name: sourceNameMap.get(item.sourceId) ?? "Unknown",
      count: item._count.sourceId,
    })),
  ];

  const categoryCountMap = new Map(groupedCounts.map((item) => [item.category, item._count.category]));
  const allCount = groupedCounts.reduce((sum, item) => sum + item._count.category, 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const latest = await prisma.article.findMany({
    where,
    include: { source: true },
    orderBy:
      effectiveSort === "latest"
        ? { fetchedAt: "desc" }
        : [{ finalScore: { sort: "desc", nulls: "last" } }, { score: "desc" }, { fetchedAt: "desc" }],
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
            {sortOptions.map((option) => {
              const active = effectiveSort === option.value;
              return (
                <Link
                  key={option.value}
                  href={buildSortHref(option.value, categoryParam, effectiveRange, sourceParam)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  排序：{option.label}
                </Link>
              );
            })}
            {rangeOptions.map((option) => {
              const active = effectiveRange === option.value;
              return (
                <Link
                  key={option.value}
                  href={buildRangeHref(option.value, categoryParam, effectiveSort, sourceParam)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    active ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {categoryOptions.map((option) => {
            const active = (option.value === "ALL" && !categoryParam) || option.value === categoryParam;
            const count = option.value === "ALL" ? allCount : (categoryCountMap.get(option.value) ?? 0);
            return (
              <Link
                key={option.value}
                href={buildCategoryHref(option.value, effectiveRange, effectiveSort, sourceParam)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {option.label} ({count})
              </Link>
            );
          })}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {sourceOptions.map((option) => {
            const active = (option.id === "ALL" && !sourceParam) || option.id === sourceParam;
            return (
              <Link
                key={option.id}
                href={buildSourceHref(option.id, categoryParam, effectiveRange, effectiveSort)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  active ? "border-emerald-700 bg-emerald-700 text-white" : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {option.name} ({option.count})
              </Link>
            );
          })}
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
              href={buildPageHref(Math.max(1, safePage - 1), categoryParam, effectiveRange, effectiveSort, sourceParam)}
              className={`rounded-lg border px-3 py-1 text-sm ${hasPrev ? "hover:bg-zinc-100" : "pointer-events-none opacity-40"}`}
            >
              上一页
            </Link>
            <Link
              href={buildPageHref(safePage + 1, categoryParam, effectiveRange, effectiveSort, sourceParam)}
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
