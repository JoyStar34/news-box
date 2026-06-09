import { subDays } from "date-fns";

export function utcDayStart(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function getRecentBriefDemotionRange(now: Date = new Date()): { gte: Date; lt: Date } {
  const day = utcDayStart(now);
  return { gte: utcDayStart(subDays(now, 2)), lt: day };
}
