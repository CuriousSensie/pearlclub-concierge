import type { UIMessage } from "ai";
import { z } from "zod";
import { BOOKING_TYPES, LANGUAGE_CODES, LIMITS, TOOL_NAMES } from "@/lib/domain";

/** Place and hotel-service ids (Dato ids, kebab-case slugs). Strict so they are safe in query filters. */
export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, "Invalid id");

/** Opaque anonymous session id (nanoid alphabet). Colons are impossible, so ids cannot forge counter keys. */
export const sessionIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/, "Invalid session id");

const isRealDate = (iso: string): boolean => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine(isRealDate, "Not a real calendar date");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const bookingInputSchema = z.object({
  /** Client-generated per form so a retry or double submit cannot create a second booking. */
  idempotency_key: z.uuid(),
  hotel_id: z.string().max(40),
  booking_type: z.enum(BOOKING_TYPES),
  item_id: idSchema,
  item_name: z.string().trim().min(1).max(200),
  date: isoDateSchema,
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM")
    .nullish()
    .transform((v) => v ?? null),
  party_size: z.number().int().min(1, "Party size must be 1-20").max(20, "Party size must be 1-20"),
  guest_name: z.string().trim().min(1, "Name is required").max(100),
  guest_email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  room_number: optionalText(20),
  notes: optionalText(500),
});
export type BookingInput = z.infer<typeof bookingInputSchema>;

export const profilePatchSchema = z.object({
  name: z.string().trim().max(60).nullable().optional(),
  language: z.enum(LANGUAGE_CODES).optional(),
  travel_style: z.string().trim().max(30).nullable().optional(),
  budget: z.enum(["budget", "mid", "luxury"]).nullable().optional(),
  interests: z.array(z.string().trim().max(30)).max(10).optional(),
  dietary: z.array(z.string().trim().max(30)).max(10).optional(),
  home_city: z.string().trim().max(60).nullable().optional(),
});

export const saveRequestSchema = z
  .object({ place_id: idSchema.optional(), place_ids: z.array(idSchema).max(20).optional() })
  .refine((v) => v.place_id || v.place_ids?.length, "place_id or place_ids is required");

export const userLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const textPart = z.object({ type: z.literal("text"), text: z.string().max(4000) });
const stepStartPart = z.object({ type: z.literal("step-start") });
const TOOL_PART_TYPES = new Set(TOOL_NAMES.map((n) => `tool-${n}`));
const TERMINAL_TOOL_STATES = new Set(["output-available", "output-error"]);

const jsonSize = (value: unknown): number => {
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return Infinity;
  }
};

/** Keeps only parts we render and trust: text, step markers and completed calls to our own tools. */
function sanitizePart(part: unknown): unknown | null {
  const text = textPart.safeParse(part);
  if (text.success) return text.data;
  if (stepStartPart.safeParse(part).success) return { type: "step-start" };
  if (typeof part !== "object" || part === null) return null;

  const p = part as Record<string, unknown>;
  if (
    typeof p.type === "string" &&
    TOOL_PART_TYPES.has(p.type) &&
    typeof p.toolCallId === "string" &&
    p.toolCallId.length <= 100 &&
    typeof p.state === "string" &&
    TERMINAL_TOOL_STATES.has(p.state) &&
    jsonSize(p.input) <= LIMITS.toolPayloadChars &&
    jsonSize(p.output) <= LIMITS.toolPayloadChars
  ) {
    return {
      type: p.type,
      toolCallId: p.toolCallId,
      state: p.state,
      input: p.input,
      output: p.output,
      errorText: typeof p.errorText === "string" ? p.errorText.slice(0, 500) : undefined,
    };
  }
  return null;
}

const rawMessageSchema = z.object({
  id: z.string().max(100),
  // `system` is deliberately not accepted: only the server writes system instructions.
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.unknown()).max(40),
});

export const chatRequestSchema = z.object({
  messages: z.array(rawMessageSchema).min(1).max(LIMITS.requestMessages),
  hotelId: z.string().max(40).optional(),
  language: z.string().max(5).optional(),
  userLocation: userLocationSchema.nullish(),
});

/**
 * Validates and sanitises the conversation sent by the browser. Returns null when the request is
 * malformed or does not end on a user message.
 */
export function parseChatMessages(body: unknown) {
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return null;

  const messages = parsed.data.messages.map(
    (m) =>
      ({
        id: m.id,
        role: m.role,
        parts: m.parts.map(sanitizePart).filter((p): p is NonNullable<typeof p> => p !== null),
      }) as UIMessage,
  );
  if (messages.at(-1)?.role !== "user") return null;
  return { ...parsed.data, messages };
}
