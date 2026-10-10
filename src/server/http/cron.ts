import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";
import { HttpError } from "@/server/http/errors";

/**
 * Vercel Cron calls scheduled routes with `Authorization: Bearer $CRON_SECRET`.
 * Throws 503 when the secret is not configured (the route is disabled) and 401 on a mismatch.
 */
export function requireCronAuth(req: Request): void {
  const secret = env().CRON_SECRET;
  if (!secret) throw new HttpError(503, "Cron is not configured");

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new HttpError(401, "Unauthorized");
  }
}
