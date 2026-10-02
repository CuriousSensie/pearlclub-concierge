import { getLiveContext } from "@/lib/context";
import { haversineKm } from "@/lib/geo";
import { areaName } from "@/lib/geocode";
import { getHotel } from "@/lib/hotels";
import { buildRails } from "@/lib/rails";
import { enforceLookupLimit, errorResponse } from "@/lib/rateLimit";

/** A guest further than this from the hotel is treated as "not here"; rails stay hotel-centred. */
const NEARBY_KM = 30;

/** Zero-LLM welcome content: live weather/time plus rails of real places for this moment. */
export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const hotel = getHotel(url.searchParams.get("hotel"));
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const valid = url.searchParams.has("lat") && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    if (valid) await enforceLookupLimit(req);
    const near = valid && haversineKm(hotel.lat, hotel.lng, lat, lng) <= NEARBY_KM;
    const anchor = near ? { lat, lng } : { lat: hotel.lat, lng: hotel.lng };

    const [context, label] = await Promise.all([
      getLiveContext(hotel, new Date(), anchor),
      near ? areaName(lat, lng) : Promise.resolve(null),
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
    return errorResponse(err);
  }
}
