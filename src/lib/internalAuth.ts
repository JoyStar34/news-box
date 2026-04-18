import { NextRequest } from "next/server";

export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  return token === secret;
}
