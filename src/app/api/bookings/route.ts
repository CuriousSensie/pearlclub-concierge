import { getHotel, HOTELS } from "@/lib/hotels";
import { LIMITS } from "@/lib/domain";
import { canonicalServiceName } from "@/lib/services";
import { bookingInputSchema } from "@/lib/schemas";
import { createBooking, listBookings } from "@/server/db/bookings";
import { getPlacesByIds } from "@/server/db/places";
import { HttpError, errorResponse } from "@/server/http/errors";
import { getRequestId, readJson, requireSessionId } from "@/server/http/guards";
import { enforceReadLimit, enforceWriteLimit } from "@/server/http/rateLimit";

/** Furthest ahead a request can be made. */
const MAX_DAYS_AHEAD = 365;

/** Today's date (YYYY-MM-DD) in the hotel's timezone. */
function todayAt(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  try {
    const sessionId = requireSessionId(req);
    await enforceWriteLimit(req);

    const parsed = bookingInputSchema.safeParse(await readJson(req, LIMITS.writeBodyBytes));
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join("; ");
      throw new HttpError(400, message);
    }
    const input = parsed.data;
    if (!(input.hotel_id in HOTELS)) throw new HttpError(400, "hotel_id: unknown hotel");
    const hotel = getHotel(input.hotel_id);

    const today = todayAt(hotel.timezone);
    if (input.date < today) throw new HttpError(400, "date: cannot be in the past");
    if (input.date > addDays(today, MAX_DAYS_AHEAD)) {
      throw new HttpError(400, `date: cannot be more than ${MAX_DAYS_AHEAD} days ahead`);
    }

    // Canonicalise the item so the stored name always matches a real service/place.
    let itemName: string;
    if (input.booking_type === "hotel_service") {
      const service = hotel.services.find((s) => s.id === input.item_id);
      if (!service) throw new HttpError(400, "item_id: unknown hotel service");
      itemName = canonicalServiceName(service.id);
    } else {
      const [place] = await getPlacesByIds([input.item_id]);
      if (!place) throw new HttpError(400, "item_id: unknown place");
      itemName = place.name;
    }

    const { booking, replayed } = await createBooking(sessionId, input, itemName);
    return Response.json(
      { booking },
      { status: replayed ? 200 : 201, headers: { "x-request-id": requestId } },
    );
  } catch (err) {
    return errorResponse(err, requestId);
  }
}

export async function GET(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  try {
    const sessionId = requireSessionId(req);
    await enforceReadLimit(req);
    return Response.json({ bookings: await listBookings(sessionId) });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
