import { NextResponse } from "next/server";
import { getDailyTopArticles } from "@/server/brief/dailyBriefService";

export async function GET() {
  const top = await getDailyTopArticles();

  return NextResponse.json({ data: top });
}

