"use client";

import { createContext, useContext } from "react";
import type { Hotel } from "@/lib/hotels";
import type { Strings } from "@/lib/i18n";
import type { Booking, Language, Place, UserLocation } from "@/lib/types";

export type AppState = {
  hotel: Hotel;
  lang: Language;
  s: Strings;
  userLocation: UserLocation | null;
  savedIds: Set<string>;
  toggleSave: (place: Place) => Promise<void>;
  saveMany: (places: Place[]) => Promise<void>;
  sendText: (text: string) => void;
  onBooked: (booking: Booking) => void;
};

const AppContext = createContext<AppState | null>(null);

export const AppProvider = AppContext.Provider;

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
