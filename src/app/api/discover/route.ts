import { getLiveContext } from "@/lib/context";
import { getHotel } from "@/lib/hotels";
import { buildRails } from "@/lib/rails";
import { errorResponse } from "@/lib/rateLimit";

/** Zero-LLM welcome content: live weather/time plus rails of real places for this moment. */
export async function GET(req: Request): Promise<Response> {
  try {
    const hotel = getHotel(new URL(req.url).searchParams.get("hotel"));
    const context = await getLiveContext(hotel);
    const rails = await buildRails(hotel, context);
    return Response.json(
      {
        context: {
          partOfDay: context.partOfDay,
          weekday: context.weekday,
          weather: context.weather,
        },
        rails,
      },
      { headers: { "cache-control": "private, max-age=60" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
