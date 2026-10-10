import "server-only";
import { incrementUsage } from "../db/usage";
import { env } from "../env";
import { HttpError } from "./errors";

/**
 * Counters live in the `usage` table under namespaced keys. Session ids are validated to a charset
 * without ":", so no client-controlled value can ever collide with the ip/global/write/lookup keys.
 */
const keys = {
  session: (id: string) => `s:${id}`,
  ip: (hash: string, day: string) => `ip:${hash}:${day}`,
  global: (day: string) => `g:${day}`,
  write: (hash: string, day: string) => `w:${hash}:${day}`,
  lookup: (hash: string, day: string) => `l:${hash}:${day}`,
};

/** Daily caps protect the budget from scripted abuse; off in local dev unless asked for. */
const dailyLimitsEnabled = (): boolean => {
  const e = env();
  return e.NODE_ENV === "production" || e.ENFORCE_DAILY_LIMITS === "true";
};

const today = (): string => new Date().toISOString().slice(0, 10);

/** A privacy-preserving client key: the first 8 bytes of sha256(ip), hex-encoded. */
export async function clientKey(req: Request): Promise<string> {
  // On Vercel the platform sets x-forwarded-for, so its first entry is the real client address.
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

async function consume(key: string, limit: number, message: string): Promise<void> {
  if ((await incrementUsage(key)) > limit) throw new HttpError(429, message);
}

/**
 * Counts one chat message against three budgets, cheapest to abuse first: the browser session,
 * the client IP per day (survives clearing storage), and the whole demo per day.
 * A request rejected by an earlier budget never touches a later one.
 */
export async function enforceChatLimit(req: Request, sessionId: string): Promise<void> {
  const e = env();
  await consume(
    keys.session(sessionId),
    e.MAX_MESSAGES_PER_SESSION,
    "Demo limit reached for this session",
  );
  if (!dailyLimitsEnabled()) return;

  const day = today();
  const hash = await clientKey(req);
  await consume(keys.ip(hash, day), e.MAX_MESSAGES_PER_IP_PER_DAY, "Demo limit reached for today");
  await consume(keys.global(day), e.MAX_MESSAGES_PER_DAY, "The demo has reached its daily limit");
}

/** Daily cap on mutating requests (bookings, saves, profile) per client IP. */
export async function enforceWriteLimit(req: Request): Promise<void> {
  if (!dailyLimitsEnabled()) return;
  await consume(
    keys.write(await clientKey(req), today()),
    env().MAX_WRITES_PER_IP_PER_DAY,
    "Request limit reached for today",
  );
}

/** Cap for geocoded discover lookups, which call a free third-party service. */
export async function enforceLookupLimit(req: Request): Promise<void> {
  if (!dailyLimitsEnabled()) return;
  await consume(
    keys.lookup(await clientKey(req), today()),
    env().MAX_LOOKUPS_PER_IP_PER_DAY,
    "Lookup limit reached for today",
  );
}

// ---- Burst limiter for reads: in memory (per server instance), so it costs no database call. ----

type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();
const READ_WINDOW_MS = 60_000;
const READ_LIMIT_PER_WINDOW = 120;
const MAX_TRACKED = 5_000;

/** Throttles bursts of read requests from one IP. Best effort: each serverless instance counts alone. */
export async function enforceReadLimit(req: Request, now = Date.now()): Promise<void> {
  const key = await clientKey(req);
  if (windows.size > MAX_TRACKED) {
    for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  }
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + READ_WINDOW_MS });
    return;
  }
  current.count += 1;
  if (current.count > READ_LIMIT_PER_WINDOW)
    throw new HttpError(429, "Too many requests, slow down");
}

/** Test hook: clears the in-memory read windows. */
export function resetReadLimiter(): void {
  windows.clear();
}
