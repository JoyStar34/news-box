import { NextResponse } from "next/server";
import { getTimeLabel } from "@/lib/articleTimeLabels";
import { mergeOpportunityIntoArticles } from "@/server/brief/opportunityLayer";
import {
  attachRepeatFromYesterday,
  getDailyTopArticles,
  getTodayDailyBriefBody,
  getYesterdayTopArticleIds,
} from "@/server/brief/dailyBriefService";

export async function GET() {
  const [top, yesterdayIds, briefBody] = await Promise.all([
    getDailyTopArticles(),
    getYesterdayTopArticleIds(),
    getTodayDailyBriefBody(),
  ]);
  const withOpp = mergeOpportunityIntoArticles(attachRepeatFromYesterday(top, yesterdayIds), briefBody);
  const withMeta = withOpp.map((article) => ({
    ...article,
    timeLabel: getTimeLabel(article),
  }));

  return NextResponse.json({ data: withMeta });
}

