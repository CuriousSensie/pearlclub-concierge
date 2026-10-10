"use client";

import { useCallback, useState } from "react";
import type { UserLocation } from "@/lib/types";

/** Opt-in browser location. Denial or failure is silent: the app falls back to the hotel's location. */
export function useGeolocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }, []);

  return { location, request };
}
