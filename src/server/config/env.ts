import { z } from "zod";
import { isValidCronSecret } from "@/lib/internalAuth";

const optionalText = z.preprocess(
  (value) => typeof value === "string" ? value.trim() || undefined : value,
  z.string().min(1).optional(),
);

function isDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["postgres:", "postgresql:", "prisma:", "prisma+postgres:"].includes(url.protocol) && !!url.hostname;
  } catch {
    return false;
  }
}

function isProviderUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return (url.protocol === "https:" || (url.protocol === "http:" && local)) &&
      !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

const envSchema = z.object({
  DATABASE_URL: z.string().trim().min(1).refine(isDatabaseUrl),
  OPENAI_API_KEY: optionalText,
  OPENAI_BASE_URL: optionalText.refine((value) => !value || isProviderUrl(value)),
  OPENAI_MODEL: optionalText,
  CRON_SECRET: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().refine(isValidCronSecret).optional(),
  ),
}).superRefine((env, ctx) => {
  if (env.OPENAI_API_KEY && !env.OPENAI_MODEL) {
    ctx.addIssue({ code: "custom", path: ["OPENAI_MODEL"], message: "Required when AI is configured" });
  }
});

/** Validate at job execution time, so a production build does not need live credentials. */
export function getEnv(source: Record<string, string | undefined> = process.env) {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    // Never stringify the original input or a provider/database credential in an error.
    throw new Error(`Invalid environment configuration: ${fields.join(", ")}. Check .env.example.`);
  }
  return parsed.data;
}

