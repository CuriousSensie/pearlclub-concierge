import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const base = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  OPENAI_API_KEY: "sk-test",
  OPENAI_MODEL: "gpt-4.1-mini",
};

describe("parseEnv", () => {
  it("accepts a minimal OpenAI configuration and applies defaults", () => {
    const env = parseEnv(base);
    expect(env.MAX_MESSAGES_PER_SESSION).toBe(40);
    expect(env.MAX_MESSAGES_PER_IP_PER_DAY).toBe(80);
    expect(env.MAX_MESSAGES_PER_DAY).toBe(1500);
    expect(env.NODE_ENV).toBe("development");
  });

  it("accepts a Gemini-only configuration", () => {
    const rest = Object.fromEntries(
      Object.entries(base).filter(([key]) => !key.startsWith("OPENAI_")),
    );
    expect(() =>
      parseEnv({ ...rest, GOOGLE_GENERATIVE_AI_API_KEY: "g", AI_MODELS: "gemini-x" }),
    ).not.toThrow();
  });

  it("treats empty strings as unset", () => {
    const env = parseEnv({
      ...base,
      CRON_SECRET: "",
      OPENAI_FAST_MODEL: "",
      MAX_MESSAGES_PER_DAY: "",
    });
    expect(env.CRON_SECRET).toBeUndefined();
    expect(env.OPENAI_FAST_MODEL).toBeUndefined();
    expect(env.MAX_MESSAGES_PER_DAY).toBe(1500);
  });

  it("reads numeric overrides", () => {
    expect(parseEnv({ ...base, MAX_MESSAGES_PER_DAY: "10" }).MAX_MESSAGES_PER_DAY).toBe(10);
  });

  it("explains every problem at once", () => {
    expect(() => parseEnv({})).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL[\s\S]*SUPABASE_SERVICE_ROLE_KEY[\s\S]*Configure a model/,
    );
  });

  it("rejects an invalid URL, a bad number and a short cron secret", () => {
    expect(() => parseEnv({ ...base, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
    expect(() => parseEnv({ ...base, MAX_MESSAGES_PER_DAY: "-5" })).toThrow(/MAX_MESSAGES_PER_DAY/);
    expect(() => parseEnv({ ...base, CRON_SECRET: "short" })).toThrow(/CRON_SECRET/);
  });
});
