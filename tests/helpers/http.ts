export const SESSION = "V1StGXR8_Z5jdHi6B-myT";

/** A JSON request carrying the session header unless `session` is null. */
export function jsonRequest(
  url: string,
  method: string,
  body?: unknown,
  {
    session = SESSION,
    headers = {},
  }: { session?: string | null; headers?: Record<string, string> } = {},
): Request {
  return new Request(url, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(session ? { "x-session-id": session } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** ISO date `days` from now (UTC). */
export function isoDateInDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
