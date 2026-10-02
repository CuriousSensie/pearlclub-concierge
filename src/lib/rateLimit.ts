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

/** Counts one chat message for the session; throws 429 beyond MAX_MESSAGES_PER_SESSION. */
export async function enforceRateLimit(sessionId: string): Promise<void> {
  const max = Number(process.env.MAX_MESSAGES_PER_SESSION ?? 40);
  const { data, error } = await getSupabase().rpc("increment_usage", { p_session_id: sessionId });
  if (error) throw new HttpError(500, `Rate limit check failed: ${error.message}`);
  if (typeof data === "number" && data > max) {
    throw new HttpError(429, "Demo limit reached for this session");
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError)
    return Response.json({ error: err.message }, { status: err.status });
  console.error(err);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
