import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildDailyBrief } from "@/server/brief/dailyBrief";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [top, latest, brief] = await Promise.all([
    prisma.article.findMany({
      include: { source: true },
      orderBy: [{ score: "desc" }, { fetchedAt: "desc" }],
      take: 3,
    }),
    prisma.article.findMany({
      include: { source: true },
      orderBy: { fetchedAt: "desc" },
      take: 20,
    }),
    buildDailyBrief(),
  ]);

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
            <article key={article.id} className="rounded-xl border p-4">
              <p className="text-xs text-zinc-500">
                {article.source.name} · {article.category}
              </p>
              <h3 className="mt-2 font-semibold leading-6">{article.title}</h3>
              <p className="mt-2 text-sm text-zinc-700">{article.summaryAi ?? article.summaryRaw ?? "暂无摘要"}</p>
              <Link className="mt-3 inline-block text-sm text-blue-600 hover:underline" href={article.url} target="_blank">
                阅读原文
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">最新新闻</h2>
        <div className="space-y-3">
          {latest.map((article) => (
            <article key={article.id} className="rounded-xl border p-4">
              <p className="text-xs text-zinc-500">
                {article.source.name} · {article.category}
              </p>
              <h3 className="mt-1 font-semibold">{article.title}</h3>
              <p className="mt-2 text-sm text-zinc-700">{article.summaryAi ?? article.summaryRaw ?? "暂无摘要"}</p>
              <Link className="mt-2 inline-block text-sm text-blue-600 hover:underline" href={article.url} target="_blank">
                原文链接
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
