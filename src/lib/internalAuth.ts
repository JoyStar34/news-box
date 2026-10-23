import { createHash, timingSafeEqual } from "node:crypto";

const BEARER_TOKEN = /^[A-Za-z0-9._~+/-]+=*$/;

/** Use a randomly generated token, not a password or an example value. */
export function isValidCronSecret(secret: string | undefined): secret is string {
  return !!secret && secret.length >= 32 && secret.length <= 512 &&
    !/\s/.test(secret) && BEARER_TOKEN.test(secret);
}

export function isCronAuthorized(
  request: { headers: Pick<Headers, "get"> },
  secret = process.env.CRON_SECRET,
): boolean {
  if (!isValidCronSecret(secret)) return false;

  // Require the authentication scheme. A raw secret or a combined header is not a credential.
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/i.exec(authorization);
  if (match?.[0] !== authorization) return false;
  const token = match?.[1];
  if (!token || token.length > 512) return false;

  // Fixed-length digests avoid both early string comparison and secret-length disclosure.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(token), digest(secret));
}
