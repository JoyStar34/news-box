import Link from "next/link";
import { Category } from "@prisma/client";
import { TopOpportunitySection } from "@/components/TopOpportunitySection";
import { DISPLAY_SUMMARY_FALLBACK, DISPLAY_WHY_FALLBACK } from "@/lib/articleDisplayDefaults";
import { getTimeLabel } from "@/lib/articleTimeLabels";
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
  { label: "最新信号", value: "latest" },
  { label: "机会优先", value: "top" },
];

const radarLanes = [
  { label: "产品化窗口", text: "能被小团队快速包装成工具、插件或自动化服务的变化。", tone: "border-emerald-500" },
  { label: "内容红利", text: "适合拆解、教程、案例库、榜单和垂直社群的早期话题。", tone: "border-sky-500" },
  { label: "技术迁移", text: "模型、框架、论文和开源项目带来的能力跃迁。", tone: "border-violet-500" },
  { label: "平台风险", text: "价格、政策、接口、版权和生态格局变化带来的调整窗口。", tone: "border-amber-500" },
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

function categoryLabel(category: Category): string {
  return categoryOptions.find((option) => option.value === category)?.label ?? category;
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
  return `/?${params.toString()}`;
}

function buildSortHref(sort: string, category: string | undefined, range: string | undefined, sourceId: string | undefined) {
  const params = new URLSearchParams();
  params.set("sort", sort);
  if (category) params.set("category", category);
  if (range) params.set("range", range);
  if (sourceId) params.set("source", sourceId);
  return `/?${params.toString()}`;
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
  if (sourceParam) where.sourceId = sourceParam;
  if (rangeStart) where.fetchedAt = { gte: rangeStart };

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
  const brief = { title: "今日机会雷达", text: briefData.text };
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
  const highOpportunityCount = top.filter((article) => (article.opportunityScore ?? 0) >= 4).length;

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
          <Link href="/" className="text-sm font-semibold tracking-[0.16em] text-zinc-900">
            AI 机会雷达
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <a className="rounded-md px-3 py-2 text-zinc-700 hover:bg-white" href="#radar">
              今日雷达
            </a>
            <a className="rounded-md px-3 py-2 text-zinc-700 hover:bg-white" href="#signals">
              信号流
            </a>
            <a
              className="rounded-md bg-zinc-950 px-3 py-2 font-semibold text-white hover:bg-zinc-800"
              href="mailto:hello@newsbox.ai?subject=申请开通 AI 机会雷达 Pro"
            >
              开通 Pro
            </a>
          </nav>
        </header>

        <section className="grid gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">from news aggregator to opportunity radar</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-zinc-950 sm:text-5xl">
              把 AI 新闻变成可下注的机会清单
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600">
              每天扫描全球 AI、科技、论文和产品动态，优先呈现能转化为产品、内容、自动化服务或投资研究线索的信号。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">当前窗口</p>
              <p className="mt-2 text-3xl font-semibold">{effectiveRange}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">已捕捉信号</p>
              <p className="mt-2 text-3xl font-semibold">{allCount}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">今日重点机会</p>
              <p className="mt-2 text-3xl font-semibold">{top.length}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">高机会指数</p>
              <p className="mt-2 text-3xl font-semibold">{highOpportunityCount || "Pro"}</p>
            </div>
          </div>
        </section>

        <section id="radar" className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{brief.title}</h2>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">Daily</span>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-700">{brief.text}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {radarLanes.map((lane) => (
              <div key={lane.label} className={`rounded-lg border border-zinc-200 bg-white p-4 shadow-sm ${lane.tone} border-l-4`}>
                <h3 className="text-sm font-semibold text-zinc-950">{lane.label}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{lane.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">opportunity board</p>
              <h2 className="mt-2 text-2xl font-semibold">今日机会榜</h2>
            </div>
            <a
              href="mailto:hello@newsbox.ai?subject=申请接收 AI 机会雷达样刊"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:border-zinc-950"
            >
              索取样刊
            </a>
          </div>

          {top.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600">当前暂无高价值信号，稍后更新。</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {top.map((article, index) => (
                <article key={article.id} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-zinc-950 px-2 py-1 text-xs font-semibold text-white">#{index + 1}</span>
                    <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">{getTimeLabel(article)}</span>
                    {article.repeatFromYesterday ? (
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">连续上榜</span>
                    ) : null}
                  </div>
                  <p className="mt-4 text-xs text-zinc-500">
                    {article.source.name} · {categoryLabel(article.category)} · {formatDate(article.publishedAt ?? article.fetchedAt)}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold leading-7">{article.title}</h3>
                  <p className="mt-3 line-clamp-5 text-sm leading-6 text-zinc-700">
                    {article.summaryAi?.trim() || article.summaryRaw?.trim() || DISPLAY_SUMMARY_FALLBACK}
                  </p>
                  <p className="mt-4 border-l-2 border-zinc-300 pl-3 text-xs leading-5 text-zinc-600">
                    重要性：{article.whyImportant?.trim() || DISPLAY_WHY_FALLBACK}
                  </p>
                  <TopOpportunitySection article={article} />
                  <Link className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-900" href={article.url} target="_blank">
                    查看证据源
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10 rounded-lg border border-zinc-900 bg-zinc-950 p-6 text-white">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-300">pro model</p>
              <h2 className="mt-3 text-2xl font-semibold">付费版卖的是“下一步”，不是更多新闻</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
                Pro 把信号进一步拆成机会指数、可执行动作、适合人群、时间窗口和风险提示，适合独立开发者、内容团队、研究员和 AI 产品负责人。
              </p>
            </div>
            <div className="grid gap-2 text-sm text-zinc-200">
              <div className="flex items-center justify-between border-b border-white/15 py-2">
                <span>每日 Top 3 机会拆解</span>
                <span className="font-semibold text-white">Pro</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/15 py-2">
                <span>按行业/角色订阅提醒</span>
                <span className="font-semibold text-white">Pro</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>周报与复盘数据</span>
                <span className="font-semibold text-white">Pro</span>
              </div>
            </div>
          </div>
        </section>

        <section id="signals" className="pb-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">evidence stream</p>
              <h2 className="mt-2 text-2xl font-semibold">实时信号流</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => {
                const active = effectiveSort === option.value;
                return (
                  <Link
                    key={option.value}
                    href={buildSortHref(option.value, categoryParam, effectiveRange, sourceParam)}
                    className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                      active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-950"
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
              {rangeOptions.map((option) => {
                const active = effectiveRange === option.value;
                return (
                  <Link
                    key={option.value}
                    href={buildRangeHref(option.value, categoryParam, effectiveSort, sourceParam)}
                    className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                      active ? "border-emerald-700 bg-emerald-700 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-700"
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
                  className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                    active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-950"
                  }`}
                >
                  {option.label} ({count})
                </Link>
              );
            })}
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {sourceOptions.map((option) => {
              const active = (option.id === "ALL" && !sourceParam) || option.id === sourceParam;
              return (
                <Link
                  key={option.id}
                  href={buildSourceHref(option.id, categoryParam, effectiveRange, effectiveSort)}
                  className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                    active ? "border-sky-700 bg-sky-700 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:border-sky-700"
                  }`}
                >
                  {option.name} ({option.count})
                </Link>
              );
            })}
          </div>

          <div className="space-y-3">
            {latest.map((article) => (
              <article key={article.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-zinc-500">
                  {article.source.name} · {categoryLabel(article.category)} · {formatDate(article.publishedAt ?? article.fetchedAt)}
                </p>
                <h3 className="mt-2 font-semibold leading-6">{article.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-700">
                  {article.summaryAi?.trim() || article.summaryRaw?.trim() || DISPLAY_SUMMARY_FALLBACK}
                </p>
                <p className="mt-3 border-l-2 border-zinc-300 pl-3 text-xs leading-5 text-zinc-600">
                  重要性：{article.whyImportant?.trim() || DISPLAY_WHY_FALLBACK}
                </p>
                <Link className="mt-3 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-900" href={article.url} target="_blank">
                  原文链接
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-600">
              第 {safePage} / {totalPages} 页，共 {total} 条
            </p>
            <div className="flex gap-2">
              <Link
                href={buildPageHref(Math.max(1, safePage - 1), categoryParam, effectiveRange, effectiveSort, sourceParam)}
                className={`rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold ${hasPrev ? "hover:border-zinc-950" : "pointer-events-none opacity-40"}`}
              >
                上一页
              </Link>
              <Link
                href={buildPageHref(safePage + 1, categoryParam, effectiveRange, effectiveSort, sourceParam)}
                className={`rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold ${hasNext ? "hover:border-zinc-950" : "pointer-events-none opacity-40"}`}
              >
                下一页
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
