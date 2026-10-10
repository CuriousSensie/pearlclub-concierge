import { getLiveContext } from "@/server/context/liveContext";
import { haversineKm } from "@/lib/geo";
import { areaName } from "@/server/context/geocode";
import { getHotel } from "@/lib/hotels";
import { buildRails } from "@/server/context/rails";
import { userLocationSchema } from "@/lib/schemas";
import { errorResponse } from "@/server/http/errors";
import { getRequestId } from "@/server/http/guards";
import { enforceLookupLimit, enforceReadLimit } from "@/server/http/rateLimit";

/** A guest further than this from the hotel is treated as "not here"; rails stay hotel-centred. */
const NEARBY_KM = 30;

/** Zero-LLM welcome content: live weather/time plus rails of real places for this moment. */
export async function GET(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  try {
    await enforceReadLimit(req);
    const url = new URL(req.url);
    const hotel = getHotel(url.searchParams.get("hotel"));

    const hasCoords = url.searchParams.has("lat") && url.searchParams.has("lng");
    const parsed = hasCoords
      ? userLocationSchema.safeParse({
          lat: Number(url.searchParams.get("lat")),
          lng: Number(url.searchParams.get("lng")),
        })
      : null;
    const guest = parsed?.success ? parsed.data : null;
    if (guest) await enforceLookupLimit(req);

    const near =
      guest !== null && haversineKm(hotel.lat, hotel.lng, guest.lat, guest.lng) <= NEARBY_KM;
    const anchor = near && guest ? guest : { lat: hotel.lat, lng: hotel.lng };

    const [context, label] = await Promise.all([
      getLiveContext(hotel, new Date(), anchor),
      near && guest ? areaName(guest.lat, guest.lng) : Promise.resolve(null),
    ]);
    const rails = await buildRails(hotel, context, anchor);
    return Response.json(
      {
        context: {
          partOfDay: context.partOfDay,
          weekday: context.weekday,
          weather: context.weather,
          // Where the guest is: their own area when shared, otherwise the hotel's city.
          location: {
            label: label ? `${label}, ${hotel.city}` : hotel.city,
            shared: near && Boolean(label),
          },
        },
        rails,
      },
      { headers: { "cache-control": "private, max-age=60" } },
    );
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
