/**
 * Backwards-compatible export: daily brief from persisted DailyBrief + items.
 */
export { buildDailyBriefFromStore as buildDailyBrief } from "@/server/brief/dailyBriefService";
export type { DailyBriefResult } from "@/server/brief/dailyBriefService";
