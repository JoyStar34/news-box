function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 h-3 w-2/3 rounded bg-zinc-200" />
      <div className="mb-2 h-4 w-full rounded bg-zinc-200" />
      <div className="mb-2 h-4 w-11/12 rounded bg-zinc-200" />
      <div className="h-4 w-3/4 rounded bg-zinc-200" />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8 animate-pulse">
        <div className="h-8 w-52 rounded bg-zinc-200" />
        <div className="mt-3 h-4 w-2/3 rounded bg-zinc-200" />
      </div>

      <section className="mb-10 rounded-xl border p-6">
        <div className="mb-3 h-6 w-44 rounded bg-zinc-200" />
        <div className="h-4 w-full rounded bg-zinc-200" />
        <div className="mt-2 h-4 w-5/6 rounded bg-zinc-200" />
      </section>

      <section className="mb-10">
        <div className="mb-4 h-6 w-52 rounded bg-zinc-200" />
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>

      <section className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </section>
    </main>
  );
}

