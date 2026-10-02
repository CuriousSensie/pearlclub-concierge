import { z } from "zod";
import { getSupabase } from "@/lib/supabase";
import { HOTELS, getHotel } from "@/lib/hotels";
import { getPlacesByIds } from "@/lib/places";
import { HttpError, assertBodySize, errorResponse, requireSessionId } from "@/lib/rateLimit";

const bookingSchema = z.object({
  hotel_id: z.string().refine((id) => id in HOTELS, "Unknown hotel"),
  booking_type: z.enum(["hotel_service", "place"]),
  item_id: z.string().min(1),
  item_name: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z.string().max(20).optional().nullable(),
  party_size: z.number().int().min(1, "Party size must be 1-20").max(20, "Party size must be 1-20"),
  guest_name: z.string().trim().min(1, "Name is required").max(100),
  guest_email: z.string().trim().email("Enter a valid email address").max(200),
  room_number: z.string().max(20).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

/** Today's date (YYYY-MM-DD) in the hotel's timezone. */
function todayAt(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

export async function POST(req: Request): Promise<Response> {
  try {
    const sessionId = requireSessionId(req);
    assertBodySize(req);

    const parsed = bookingSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join("; ");
      throw new HttpError(400, message);
    }
    const input = parsed.data;
    const hotel = getHotel(input.hotel_id);

    if (Number.isNaN(Date.parse(input.date))) throw new HttpError(400, "date: not a valid date");
    if (input.date < todayAt(hotel.timezone))
      throw new HttpError(400, "date: cannot be in the past");

    // Canonicalise the item so the stored name always matches a real service/place.
    let itemName = input.item_name;
    if (input.booking_type === "hotel_service") {
      const service = hotel.services.find((s) => s.id === input.item_id);
      if (!service) throw new HttpError(400, "item_id: unknown hotel service");
      itemName = service.name;
    } else {
      const [place] = await getPlacesByIds([input.item_id]);
      if (!place) throw new HttpError(400, "item_id: unknown place");
      itemName = place.name;
    }

    const { data, error } = await getSupabase()
      .from("bookings")
      .insert({ ...input, item_name: itemName, session_id: sessionId, status: "requested" })
      .select()
      .single();
    if (error) throw new Error(`booking insert failed: ${error.message}`);
    return Response.json({ booking: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(req: Request): Promise<Response> {
  try {
    const sessionId = requireSessionId(req);
    const { data, error } = await getSupabase()
      .from("bookings")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`bookings lookup failed: ${error.message}`);
    return Response.json({ bookings: data });
  } catch (err) {
    return errorResponse(err);
  }
}
