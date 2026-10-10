import { purgeExpired } from "@/server/db/maintenance";
import { requireCronAuth } from "@/server/http/cron";
import { errorResponse } from "@/server/http/errors";
import { getRequestId } from "@/server/http/guards";
import { log } from "@/server/logger";

/** Daily retention job (see vercel.json): expired rate-limit counters and old booking requests. */
export async function GET(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  try {
    requireCronAuth(req);
    const removed = await purgeExpired();
    log.info("cron.purge", { requestId, ...removed });
    return Response.json({ removed });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
