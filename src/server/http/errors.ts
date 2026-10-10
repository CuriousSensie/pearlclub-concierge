import "server-only";
import { log } from "@/server/logger";

/** An error that is safe to show to the client (4xx) or that maps to a generic message (5xx). */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Converts any thrown value to a JSON response. An `HttpError` carries a message we wrote on purpose,
 * so it is returned with its status; anything else is unexpected and becomes a generic 500 whose
 * details go to the logs only.
 */
export function errorResponse(err: unknown, requestId?: string): Response {
  const headers: Record<string, string> = requestId ? { "x-request-id": requestId } : {};
  if (err instanceof HttpError) {
    if (err.status >= 500)
      log.warn("request.unavailable", { requestId, status: err.status, message: err.message });
    return Response.json({ error: err.message, requestId }, { status: err.status, headers });
  }
  log.error("request.failed", { requestId, err });
  return Response.json({ error: "Internal server error", requestId }, { status: 500, headers });
}
