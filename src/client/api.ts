import { sessionHeaders } from "./session";
import type { BookingInput } from "@/lib/schemas";
import type { Booking, DiscoverResponse, Place, Profile } from "@/lib/types";

/** An error response from our own API; `message` is the server's readable text. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(hasBody ? { "content-type": "application/json" } : {}),
      ...sessionHeaders(),
      ...init.headers,
    },
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

/** Typed client for the app's own HTTP API. All calls send the anonymous session id. */
export const api = {
  saves: {
    list: async () => (await request<{ places: Place[] }>("/api/saves")).places,
    add: (placeIds: string[]) =>
      request<{ saved: string[] }>("/api/saves", {
        method: "POST",
        body: json({ place_ids: placeIds }),
      }),
    remove: (placeId: string) =>
      request<{ removed: string }>(`/api/saves?place_id=${encodeURIComponent(placeId)}`, {
        method: "DELETE",
      }),
  },
  profile: {
    get: async () => (await request<{ profile: Profile | null }>("/api/profile")).profile,
    update: async (patch: Partial<Omit<Profile, "session_id" | "updated_at">>) =>
      (await request<{ profile: Profile }>("/api/profile", { method: "POST", body: json(patch) }))
        .profile,
  },
  bookings: {
    list: async () => (await request<{ bookings: Booking[] }>("/api/bookings")).bookings,
    create: async (input: BookingInput | Record<string, unknown>) =>
      (await request<{ booking: Booking }>("/api/bookings", { method: "POST", body: json(input) }))
        .booking,
  },
  discover: (params: URLSearchParams, signal?: AbortSignal) =>
    request<DiscoverResponse>(`/api/discover?${params}`, { signal }),
};
