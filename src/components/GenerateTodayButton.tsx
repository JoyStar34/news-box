"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GenerateResult = {
  ok: boolean;
  error?: string;
  fetch?: {
    inserted: number;
    failed: number;
    sources: number;
  };
  top?: {
    ok: boolean;
    articleIds: string[];
    reason?: string;
    promptHash?: string;
  };
};

export function GenerateTodayButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function generateToday() {
    setLoading(true);
    setMessage("正在抓取当天新闻并生成机会分析...");

    try {
      const response = await fetch("/api/generate-today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const data = (await response.json()) as GenerateResult;

      if (!response.ok || !data.ok) {
        setMessage(data.error || data.top?.reason || "生成失败，请稍后重试。");
        return;
      }

      setMessage(`已生成 ${data.top?.articleIds.length ?? 0} 条机会分析，prompt ${data.top?.promptHash ?? "unknown"}。`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={generateToday}
        disabled={loading}
        className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "生成中..." : "生成今日机会分析"}
      </button>
      {message ? <p className="max-w-xs text-xs leading-5 text-zinc-600 sm:text-right">{message}</p> : null}
    </div>
  );
}
