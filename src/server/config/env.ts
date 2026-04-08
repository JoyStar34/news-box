import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  CRON_SECRET: z.string().min(1).optional(),
});

export function getEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    return {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      CRON_SECRET: process.env.CRON_SECRET,
    };
  }

  return parsed.data;
}

