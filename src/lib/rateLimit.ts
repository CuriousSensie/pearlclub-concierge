import "server-only";
import { getSupabase } from "./supabase";

const MAX_BODY_BYTES = 64_000;
export const MAX_INPUT_CHARS = 1000;
export const MAX_HISTORY_MESSAGES = 20;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function requireSessionId(req: Request): string {
  const id = req.headers.get("x-session-id");
  if (!id || id.length < 8 || id.length > 64)
    throw new HttpError(400, "Missing or invalid x-session-id");
  return id;
}

export function assertBodySize(req: Request): void {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) throw new HttpError(413, "Request too large");
}

/** Atomically bumps a counter in the `usage` table (any text key) and returns the new value. */
async function bump(key: string): Promise<number> {
  const { data, error } = await getSupabase().rpc("increment_usage", { p_session_id: key });
  if (error) throw new HttpError(500, `Rate limit check failed: ${error.message}`);
  return typeof data === "number" ? data : 0;
}

const envInt = (name: string, fallback: number): number => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Daily caps protect the model budget from scripted abuse; off in local dev unless asked for. */
const dailyLimitsEnabled = (): boolean =>
  process.env.NODE_ENV === "production" || process.env.ENFORCE_DAILY_LIMITS === "true";

/** A privacy-preserving client key: first 16 hex chars of sha256(ip). */
export async function clientKey(req: Request): Promise<string> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Counts one chat message against three budgets, cheapest-to-abuse first:
 * the browser session, the client IP per day (survives clearing storage), and the whole demo per day.
 * A request rejected by an earlier budget never touches a later one.
 */
export async function enforceRateLimit(req: Request, sessionId: string): Promise<void> {
  if ((await bump(sessionId)) > envInt("MAX_MESSAGES_PER_SESSION", 40)) {
    throw new HttpError(429, "Demo limit reached for this session");
  }
  if (!dailyLimitsEnabled()) return;

  const day = today();
  if (
    (await bump(`ip:${await clientKey(req)}:${day}`)) > envInt("MAX_MESSAGES_PER_IP_PER_DAY", 80)
  ) {
    throw new HttpError(429, "Demo limit reached for today");
  }
  if ((await bump(`global:${day}`)) > envInt("MAX_MESSAGES_PER_DAY", 1500)) {
    throw new HttpError(429, "The demo has reached its daily limit");
  }
}

/** Cap for the cheap-but-externally-billed discover lookups (reverse geocoding). */
export async function enforceLookupLimit(req: Request): Promise<void> {
  if (!dailyLimitsEnabled()) return;
  const n = await bump(`lookup:${await clientKey(req)}:${today()}`);
  if (n > envInt("MAX_LOOKUPS_PER_IP_PER_DAY", 60)) {
    throw new HttpError(429, "Lookup limit reached for today");
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError)
    return Response.json({ error: err.message }, { status: err.status });
  console.error(err);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
