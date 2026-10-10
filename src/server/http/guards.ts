import "server-only";
import { sessionIdSchema } from "@/lib/schemas";
import { HttpError } from "./errors";

export const getRequestId = (req: Request): string =>
  req.headers.get("x-request-id")?.slice(0, 64) || crypto.randomUUID();

/** The anonymous session id; its strict format also keeps it out of other counters' key space. */
export function requireSessionId(req: Request): string {
  const parsed = sessionIdSchema.safeParse(req.headers.get("x-session-id"));
  if (!parsed.success) throw new HttpError(400, "Missing or invalid x-session-id");
  return parsed.data;
}

/**
 * Reads and parses a JSON body while enforcing a byte cap on what is actually received,
 * so a missing or dishonest Content-Length cannot bypass it.
 */
export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes)
    throw new HttpError(413, "Request too large");
  if (!req.body) throw new HttpError(400, "Request body is required");

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Request too large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
