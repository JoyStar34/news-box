import { NextResponse } from "next/server";
import { buildDailyBrief } from "@/server/brief/dailyBrief";

export async function GET() {
  const brief = await buildDailyBrief();
  return NextResponse.json({ data: brief });
}

