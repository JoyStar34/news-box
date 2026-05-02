/**
 * Backwards-compatible export: daily brief from persisted DailyBrief + items.
 */
export { buildDailyBriefFromStore as buildDailyBrief } from "@/server/brief/dailyBriefService";
export type { DailyBriefResult, TopBriefArticle } from "@/server/brief/dailyBriefService";
export type { ArticleOpportunityFields } from "@/server/brief/opportunityLayer";
