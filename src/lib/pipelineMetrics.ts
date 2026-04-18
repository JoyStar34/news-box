/** In-memory snapshot of the last successful internal pipeline runs (per server instance). */

let lastFetchInserted: number | null = null;
let lastScoreProcessed: number | null = null;
let lastSummarized: number | null = null;
let dailyTopGenerated: boolean | null = null;

export function recordLastFetch(inserted: number) {
  lastFetchInserted = inserted;
}

export function recordLastScore(processed: number) {
  lastScoreProcessed = processed;
}

export function recordLastSummarize(processed: number) {
  lastSummarized = processed;
}

export function recordDailyTop(ok: boolean) {
  dailyTopGenerated = ok;
}

export function getPipelineMetricsSnapshot() {
  return {
    lastFetchInserted,
    lastScoreProcessed,
    lastSummarized,
    dailyTopGenerated,
  };
}
