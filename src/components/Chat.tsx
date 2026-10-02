"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { AppProvider, type AppState } from "./AppContext";
import { Header } from "./Header";
import { MessageBubble, getSuggestions } from "./MessageBubble";
import { SuggestionChips } from "./SuggestionChips";
import { TripDrawer } from "./TripDrawer";
import { WelcomeScreen } from "./WelcomeScreen";
import { useToast } from "./Toaster";
import { getHotel } from "@/lib/hotels";
import { fill, isLanguage, isRTL, t } from "@/lib/i18n";
import { sessionHeaders } from "@/lib/session";
import type { Booking, Language, Place, Profile, UserLocation } from "@/types";

// Session and request body are resolved per send, so one transport serves every render.
const transport = new DefaultChatTransport({ api: "/api/chat", headers: () => sessionHeaders() });

const LANG_KEY = "pc_language";
const MAX_INPUT = 1000;

function readStoredLanguage(): Language {
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    if (isLanguage(v)) return v;
  } catch (err) {
    console.warn("could not read language", err);
  }
  return "en";
}

export function Chat({ hotelId }: { hotelId: string }) {
  const hotel = getHotel(hotelId);
  const toast = useToast();
  const [lang, setLang] = useState<Language>("en");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tripOpen, setTripOpen] = useState(false);
  const [bookingsVersion, setBookingsVersion] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, regenerate, clearError } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";
  const s = t(lang);

  // Initial client-only state: language, saved places, profile, booking count.
  useEffect(() => {
    // Reading localStorage must wait for the client to avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(readStoredLanguage());
    const headers = sessionHeaders();
    void Promise.all([
      fetch("/api/saves", { headers }).then((r) => r.json() as Promise<{ places?: Place[] }>),
      fetch("/api/profile", { headers }).then(
        (r) => r.json() as Promise<{ profile?: Profile | null }>,
      ),
      fetch("/api/bookings", { headers }).then(
        (r) => r.json() as Promise<{ bookings?: Booking[] }>,
      ),
    ])
      .then(([saves, prof, books]) => {
        setSavedIds(new Set((saves.places ?? []).map((p) => p.id)));
        setProfile(prof.profile ?? null);
        setBookingCount((books.bookings ?? []).length);
        if (
          prof.profile?.language &&
          isLanguage(prof.profile.language) &&
          !localStorageHasLanguage()
        ) {
          setLang(prof.profile.language);
        }
      })
      .catch((err) => console.error("initial load failed", err));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => {
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const requestBody = { hotelId: hotel.id, language: lang, userLocation };

  function sendText(text: string) {
    const trimmed = text.trim().slice(0, MAX_INPUT);
    if (!trimmed) return;
    clearError();
    void sendMessage({ text: trimmed }, { body: requestBody });
  }

  function changeLanguage(next: Language) {
    setLang(next);
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch (err) {
      console.warn("could not persist language", err);
    }
    void fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json", ...sessionHeaders() },
      body: JSON.stringify({ language: next }),
    }).catch((err) => console.error("language sync failed", err));
  }

  function requestLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined, // denied/unavailable: silently fall back to the hotel location
      { timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }

  async function toggleSave(place: Place) {
    {
      const wasSaved = savedIds.has(place.id);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(place.id);
        else next.add(place.id);
        return next;
      });
      try {
        const res = wasSaved
          ? await fetch(`/api/saves?place_id=${encodeURIComponent(place.id)}`, {
              method: "DELETE",
              headers: sessionHeaders(),
            })
          : await fetch("/api/saves", {
              method: "POST",
              headers: { "content-type": "application/json", ...sessionHeaders() },
              body: JSON.stringify({ place_id: place.id }),
            });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast(wasSaved ? s.toastRemoved : s.toastSaved);
      } catch (err) {
        console.error("toggle save failed", err);
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(place.id);
          else next.delete(place.id);
          return next;
        });
        toast(s.toastError, "error");
      }
    }
  }

  async function saveMany(places: Place[]) {
    {
      const ids = [...new Set(places.map((p) => p.id))];
      try {
        const res = await fetch("/api/saves", {
          method: "POST",
          headers: { "content-type": "application/json", ...sessionHeaders() },
          body: JSON.stringify({ place_ids: ids }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSavedIds((prev) => new Set([...prev, ...ids]));
        toast(s.toastSaved);
      } catch (err) {
        console.error("save all failed", err);
        toast(s.toastError, "error");
      }
    }
  }

  function onBooked(booking: Booking) {
    {
      setBookingCount((c) => c + 1);
      setBookingsVersion((v) => v + 1);
      sendText(fill(s.bookingSubmitted, { item: booking.item_name, date: booking.date }));
    }
  }

  const ctx: AppState = {
    hotel,
    lang,
    s,
    userLocation,
    savedIds,
    toggleSave,
    saveMany,
    sendText,
    onBooked,
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    sendText(input);
    setInput("");
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const suggestions =
    !busy && messages.at(-1)?.role === "assistant" ? getSuggestions(lastAssistant) : [];
  const isBusy = error?.message.includes("model_busy");
  const isLimit =
    error?.message.includes("429") || error?.message.toLowerCase().includes("demo limit");

  return (
    <AppProvider value={ctx}>
      <div
        style={{ "--accent": hotel.accentColor } as CSSProperties}
        className="flex min-h-dvh flex-col"
      >
        <Header
          tripCount={savedIds.size + bookingCount}
          onOpenTrip={() => setTripOpen(true)}
          onLanguage={changeLanguage}
        />

        <main className="mx-auto w-full max-w-3xl flex-1 px-4">
          {messages.length === 0 ? (
            <div className="-mx-4">
              <WelcomeScreen
                profile={profile}
                onProfile={setProfile}
                onRequestLocation={requestLocation}
              />
            </div>
          ) : (
            <div className="space-y-4 py-4" aria-live="polite">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {status === "submitted" && <p className="text-sm text-muted">{s.thinking}</p>}
              {suggestions.length > 0 && <SuggestionChips suggestions={suggestions} />}
              {error && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm"
                >
                  <p>{isLimit ? s.errLimit : isBusy ? s.errBusy : s.errGeneric}</p>
                  {!isLimit && (
                    <button
                      type="button"
                      onClick={() => void regenerate({ body: requestBody })}
                      className="mt-2 h-8 rounded-full border border-line px-3 font-medium"
                    >
                      {s.retry}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        <form
          onSubmit={onSubmit}
          className="sticky bottom-0 z-20 border-t border-line bg-paper/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur"
        >
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{s.placeholder}</span>
              <input
                value={input}
                maxLength={MAX_INPUT}
                onChange={(e) => setInput(e.target.value)}
                placeholder={s.placeholder}
                className="h-11 w-full rounded-full border border-line bg-card px-4 text-[15px]"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="h-11 shrink-0 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink disabled:opacity-40"
            >
              {s.send}
            </button>
          </div>
        </form>

        <TripDrawer
          open={tripOpen}
          onClose={() => setTripOpen(false)}
          bookingsVersion={bookingsVersion}
        />
      </div>
    </AppProvider>
  );
}

function localStorageHasLanguage(): boolean {
  try {
    return window.localStorage.getItem(LANG_KEY) !== null;
  } catch {
    return false;
  }
}
