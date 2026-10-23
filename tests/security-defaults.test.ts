import assert from "node:assert/strict";
import test from "node:test";
import { isCronAuthorized, isValidCronSecret } from "../src/lib/internalAuth";
import { getPlausibleDomain, getSiteUrl } from "../src/lib/siteConfig";
import { getEnv } from "../src/server/config/env";
import { safeErrorDetails } from "../src/lib/safeError";
import { MAX_PAGE, positiveInteger } from "../src/lib/requestLimits";
import { safeArticleUrl } from "../src/lib/articleUrl";

const secret = "test-only-cron-secret-0123456789abcdef";
const database = "postgresql://test:test@localhost:5432/test";
const request = (authorization: string | null) => ({
  headers: { get: (name: string) => name === "authorization" ? authorization : null },
});

test("internal jobs require a strong secret and a proper Bearer header", () => {
  assert.equal(isValidCronSecret(undefined), false);
  assert.equal(isValidCronSecret(""), false);
  assert.equal(isValidCronSecret("short"), false);
  assert.equal(isValidCronSecret(" ".repeat(40)), false);
  assert.equal(isValidCronSecret(`${secret}\n`), false);
  assert.equal(isValidCronSecret("a".repeat(513)), false);
  assert.equal(isValidCronSecret(secret), true);
  assert.equal(isCronAuthorized(request(`Bearer ${secret}`), secret), true);
  assert.equal(isCronAuthorized(request(`bearer ${secret}`), secret), true);
  assert.equal(isCronAuthorized(request(`BEARER ${secret}`), secret), true);
  for (const header of [null, secret, `Basic ${secret}`, `xBearer ${secret}`, `Bearer  ${secret}`,
    `Bearer ${secret} extra`, `Bearer ${secret}, Bearer ${secret}`, `Bearer ${secret}\n`,
    `Bearer ${secret.slice(0, -1)}x`, `Bearer ${secret}x`]) {
    assert.equal(isCronAuthorized(request(header), secret), false, String(header));
  }
  assert.equal(isCronAuthorized(request("Bearer short"), "short"), false);
  assert.equal(isCronAuthorized(request(`Bearer ${secret}`), ""), false);
});

test("analytics require explicit opt-in and the deployer's hostname", () => {
  for (const enabled of ["", "false", "1", "TRUE"]) {
    assert.equal(getPlausibleDomain(enabled, "example.com"), null);
  }
  assert.equal(getPlausibleDomain("true", ""), null);
  assert.equal(getPlausibleDomain("true", " Example.COM "), "example.com");
  for (const domain of ["https://example.com", "a.example,b.example", "example.com/path",
    "x@y.example", "example..com", "-example.com", "example-.com", "a".repeat(64) + ".com"]) {
    assert.equal(getPlausibleDomain("true", domain), null, domain);
  }
});

test("metadata uses a neutral localhost origin and validates configured origins", () => {
  assert.equal(getSiteUrl("").href, "http://localhost:3000/");
  assert.equal(getSiteUrl("https://example.com/").href, "https://example.com/");
  assert.equal(getSiteUrl("http://localhost:4000").origin, "http://localhost:4000");
  for (const url of ["invalid", "javascript:alert(1)", "https://user:secret@example.com",
    "https://example.com/private", "https://example.com/?key=secret", "https://example.com/#secret"]) {
    assert.throws(() => getSiteUrl(url), /NEXT_PUBLIC_SITE_URL/);
  }
});

test("blank optional environment settings work without choosing an AI provider/model", () => {
  const env = getEnv({ DATABASE_URL: database, OPENAI_API_KEY: "", OPENAI_BASE_URL: "",
    OPENAI_MODEL: "", CRON_SECRET: "" });
  assert.equal(env.DATABASE_URL, database);
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.OPENAI_BASE_URL, undefined);
  assert.equal(env.OPENAI_MODEL, undefined);
  assert.equal(env.CRON_SECRET, undefined);
});

test("environment validation fails closed and errors never echo configured values", () => {
  assert.throws(() => getEnv({}), /DATABASE_URL/);
  assert.throws(() => getEnv({ DATABASE_URL: "not-a-database-url" }), /DATABASE_URL/);
  assert.throws(() => getEnv({ DATABASE_URL: database, OPENAI_API_KEY: "fake-test-key" }), /OPENAI_MODEL/);
  assert.throws(() => getEnv({ DATABASE_URL: database, CRON_SECRET: "short" }), /CRON_SECRET/);
  const credential = "test-secret-not-for-real-use";
  try {
    getEnv({ DATABASE_URL: database, OPENAI_BASE_URL: `https://user:${credential}@example.com/v1` });
    assert.fail("Expected invalid configuration to throw");
  } catch (error) {
    assert.ok(error instanceof Error);
    assert.match(error.message, /OPENAI_BASE_URL/);
    assert.equal(error.message.includes(credential), false);
    assert.equal(error.message.includes(database), false);
  }
});

test("AI endpoints accept HTTPS and local HTTP, but no embedded credentials or query secrets", () => {
  for (const baseURL of ["https://api.example.com/v1", "http://localhost:11434/v1",
    "http://127.0.0.1:8000/v1", "http://[::1]:8000/v1"]) {
    const env = getEnv({ DATABASE_URL: database, OPENAI_API_KEY: "fake-test-key",
      OPENAI_MODEL: "provider/model-selected-by-owner", OPENAI_BASE_URL: baseURL });
    assert.equal(env.OPENAI_BASE_URL, baseURL);
    assert.equal(env.OPENAI_MODEL, "provider/model-selected-by-owner");
  }
  for (const baseURL of ["http://api.example.com/v1", "ftp://example.com", "not-a-url",
    "https://example.com/?api_key=private", "https://example.com/#private"]) {
    assert.throws(() => getEnv({ DATABASE_URL: database, OPENAI_BASE_URL: baseURL }), /OPENAI_BASE_URL/);
  }
});

test("error logs expose only allowlisted class and numeric HTTP status", () => {
  const error = Object.assign(new Error("secret request and response"), {
    status: 401, headers: { authorization: "private" }, request: "private", cause: "private",
  });
  error.name = "AuthenticationError";
  assert.deepEqual(safeErrorDetails(error), { kind: "AuthenticationError", status: 401 });
  error.name = "untrusted-secret-name";
  assert.deepEqual(safeErrorDetails(error), { kind: "UnknownError", status: 401 });
  assert.deepEqual(safeErrorDetails({ message: "private", status: "private" }), { kind: "UnknownError" });
  assert.deepEqual(safeErrorDetails(null), { kind: "UnknownError" });
  assert.deepEqual(safeErrorDetails("private"), { kind: "UnknownError" });
});

test("query limits are bounded positive safe integers", () => {
  for (const value of [undefined, null, "", "1.5", 1.5, "12oops", "NaN", NaN, "Infinity",
    Infinity, "1e3", "0x10", -1, 0, {}, [], Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(positiveInteger(value, 12, 50), 12, String(value));
  }
  assert.equal(positiveInteger("2", 12, 50), 2);
  assert.equal(positiveInteger(" 2 ", 12, 50), 2);
  assert.equal(positiveInteger("1000", 12, 50), 50);
  assert.equal(positiveInteger(1000, 12, 50), 50);
});

test("article links allow only absolute HTTP(S) URLs without credentials", () => {
  assert.equal(safeArticleUrl(" https://example.com/story "), "https://example.com/story");
  assert.equal(safeArticleUrl("http://example.com/story"), "http://example.com/story");
  for (const url of [null, undefined, "", "/relative", "javascript:alert(1)", "data:text/html,private",
    "file:///etc/passwd", "https://user:password@example.com/story"]) {
    assert.equal(safeArticleUrl(url), null);
  }
});

test("pagination clamps large numeric pages before calculating database offsets", () => {
  assert.equal(MAX_PAGE, 100_000);
  assert.equal(positiveInteger(String(Number.MAX_SAFE_INTEGER), 1, MAX_PAGE), MAX_PAGE);
  assert.equal(positiveInteger(Number.MAX_SAFE_INTEGER, 1, MAX_PAGE), MAX_PAGE);
  assert.equal(positiveInteger("100001", 1, MAX_PAGE), MAX_PAGE);
  assert.equal(positiveInteger("100000", 1, MAX_PAGE), MAX_PAGE);
  assert.equal(positiveInteger("20", 1, MAX_PAGE), 20);
});
