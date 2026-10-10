import { LIMITS } from "@/lib/domain";
import { isLanguage } from "@/lib/i18n";
import { profilePatchSchema } from "@/lib/schemas";
import { getProfile, replaceProfile } from "@/lib/profile";
import { HttpError, errorResponse } from "@/server/http/errors";
import { getRequestId, readJson, requireSessionId } from "@/server/http/guards";
import { enforceReadLimit, enforceWriteLimit } from "@/server/http/rateLimit";

export async function GET(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  try {
    const sessionId = requireSessionId(req);
    await enforceReadLimit(req);
    return Response.json({ profile: await getProfile(sessionId) });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}

export async function POST(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  try {
    const sessionId = requireSessionId(req);
    await enforceWriteLimit(req);
    const parsed = profilePatchSchema.safeParse(await readJson(req, LIMITS.writeBodyBytes));
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    }
    if (parsed.data.language !== undefined && !isLanguage(parsed.data.language)) {
      throw new HttpError(400, "language: Unsupported language");
    }
    const profile = await replaceProfile(
      sessionId,
      parsed.data as Parameters<typeof replaceProfile>[1],
    );
    return Response.json({ profile });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
