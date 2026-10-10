import "server-only";
import { z } from "zod";

/** Treats an empty string (`KEY=` in a .env file) as "not set". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const positiveInt = (fallback: number) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.coerce.number().int().positive().default(fallback),
  );

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  OPENAI_API_KEY: optional(z.string().min(1)),
  OPENAI_MODEL: optional(z.string().min(1)),
  OPENAI_FAST_MODEL: optional(z.string().min(1)),
  GOOGLE_GENERATIVE_AI_API_KEY: optional(z.string().min(1)),
  AI_MODELS: optional(z.string()),

  MAX_MESSAGES_PER_SESSION: positiveInt(40),
  MAX_MESSAGES_PER_IP_PER_DAY: positiveInt(80),
  MAX_MESSAGES_PER_DAY: positiveInt(1500),
  MAX_LOOKUPS_PER_IP_PER_DAY: positiveInt(60),
  MAX_WRITES_PER_IP_PER_DAY: positiveInt(300),
  ENFORCE_DAILY_LIMITS: optional(z.enum(["true", "false"])),

  /** Protects /api/cron/*; Vercel sends it as a Bearer token. */
  CRON_SECRET: optional(z.string().min(16)),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

/** A model must be configured: OpenAI (key + model) or Gemini (key + model list). */
const modelProblem = (env: Record<string, string | undefined>): string | null => {
  const filled = (v: string | undefined) => Boolean(v && v.trim());
  const hasOpenAI = filled(env.OPENAI_API_KEY) && filled(env.OPENAI_MODEL);
  const hasGemini = filled(env.GOOGLE_GENERATIVE_AI_API_KEY) && filled(env.AI_MODELS);
  return hasOpenAI || hasGemini
    ? null
    : "Configure a model: OPENAI_API_KEY + OPENAI_MODEL, or GOOGLE_GENERATIVE_AI_API_KEY + AI_MODELS";
};

export type Env = z.infer<typeof schema>;

/** Parses a variable bag; throws one readable error listing every problem. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  const problems = [
    ...(result.success
      ? []
      : result.error.issues.map((i) => `${i.path.join(".") || "config"}: ${i.message}`)),
    ...[modelProblem(source)].filter((p): p is string => p !== null).map((p) => `config: ${p}`),
  ];
  if (!result.success || problems.length) {
    throw new Error(
      "Invalid environment configuration:\n" + problems.map((p) => `  - ${p}`).join("\n"),
    );
  }
  return result.data;
}

let cached: Env | undefined;

/** The validated environment. The only place server code should read configuration from. */
export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
