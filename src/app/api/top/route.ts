import { NextResponse } from "next/server";
import { getTimeLabel } from "@/lib/articleTimeLabels";
import {
  attachRepeatFromYesterday,
  getDailyTopArticles,
  getYesterdayTopArticleIds,
} from "@/server/brief/dailyBriefService";

export async function GET() {
  const [top, yesterdayIds] = await Promise.all([getDailyTopArticles(), getYesterdayTopArticleIds()]);
  const withMeta = attachRepeatFromYesterday(top, yesterdayIds).map((article) => ({
    ...article,
    timeLabel: getTimeLabel(article),
  }));

  return NextResponse.json({ data: withMeta });
}

