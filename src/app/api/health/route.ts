import { getSupabase } from "@/server/db/client";
import { errorResponse } from "@/server/http/errors";
import { getRequestId } from "@/server/http/guards";
import { enforceReadLimit } from "@/server/http/rateLimit";

/**
 * Liveness probe. `?deep=1` also checks the database (one tiny query) for uptime monitors.
 * Never returns configuration or error details.
 */
export async function GET(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  try {
    await enforceReadLimit(req);
    if (new URL(req.url).searchParams.get("deep") === "1") {
      const { error } = await getSupabase().from("usage").select("session_id").limit(1);
      if (error) return Response.json({ status: "degraded", database: "down" }, { status: 503 });
      return Response.json({ status: "ok", database: "up" });
    }
    return Response.json({ status: "ok" });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
