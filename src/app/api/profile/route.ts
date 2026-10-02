import { z } from "zod";
import { isLanguage } from "@/lib/i18n";
import { getProfile, replaceProfile } from "@/lib/profile";
import { HttpError, assertBodySize, errorResponse, requireSessionId } from "@/lib/rateLimit";

const profileSchema = z.object({
  name: z.string().max(60).nullable().optional(),
  language: z.string().refine(isLanguage, "Unsupported language").optional(),
  travel_style: z.string().max(30).nullable().optional(),
  budget: z.enum(["budget", "mid", "luxury"]).nullable().optional(),
  interests: z.array(z.string().max(30)).max(10).optional(),
  dietary: z.array(z.string().max(30)).max(10).optional(),
  home_city: z.string().max(60).nullable().optional(),
});

export async function GET(req: Request): Promise<Response> {
  try {
    return Response.json({ profile: await getProfile(requireSessionId(req)) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const sessionId = requireSessionId(req);
    assertBodySize(req);
    const parsed = profileSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    }
    const profile = await replaceProfile(
      sessionId,
      parsed.data as Parameters<typeof replaceProfile>[1],
    );
    return Response.json({ profile });
  } catch (err) {
    return errorResponse(err);
  }
}
