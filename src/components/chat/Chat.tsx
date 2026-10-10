"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { sessionHeaders } from "@/client/session";
import { slimMessages } from "@/client/slimMessages";
import type { ConciergeUIMessage } from "@/client/chatTypes";
import { useBookings } from "@/client/hooks/useBookings";
import { useGeolocation } from "@/client/hooks/useGeolocation";
import { useGuestProfile } from "@/client/hooks/useGuestProfile";
import { useLanguage } from "@/client/hooks/useLanguage";
import { useSavedPlaces } from "@/client/hooks/useSavedPlaces";
import { AppProvider, type AppState } from "@/components/chat/ConciergeContext";
import { Composer } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { TripDrawer } from "@/components/trip/TripDrawer";
import { WelcomeScreen } from "@/components/welcome/WelcomeScreen";
import { LIMITS } from "@/lib/domain";
import { getHotel } from "@/lib/hotels";
import { fill, t } from "@/lib/i18n";
import { bookedItemLabel } from "@/lib/services";
import type { Booking } from "@/lib/types";

// Session and request body are resolved per send, so one transport serves every render.
const transport = new DefaultChatTransport<ConciergeUIMessage>({
  api: "/api/chat",
  headers: () => sessionHeaders(),
  prepareSendMessagesRequest: ({ messages, body }) => ({
    body: { ...body, messages: slimMessages(messages) },
  }),
});

/** The concierge page: owns the conversation and wires the guest's state into the UI. */
export function Chat({ hotelId }: { hotelId: string }) {
  const hotel = getHotel(hotelId);
  const [tripOpen, setTripOpen] = useState(false);

  const language = useLanguage();
  const s = t(language.lang);
  const geo = useGeolocation();
  const saves = useSavedPlaces(s);
  const bookings = useBookings();

  const { messages, sendMessage, status, error, regenerate, clearError } =
    useChat<ConciergeUIMessage>({ transport });
  const guest = useGuestProfile(messages, language.adoptIfUnset);
  const busy = status === "submitted" || status === "streaming";

  const requestBody = { hotelId: hotel.id, language: language.lang, userLocation: geo.location };

  function sendText(text: string) {
    const trimmed = text.trim().slice(0, LIMITS.inputChars);
    if (!trimmed) return;
    clearError();
    void sendMessage({ text: trimmed }, { body: requestBody });
  }

  function onBooked(booking: Booking) {
    bookings.recordBooked();
    sendText(fill(s.bookingSubmitted, { item: bookedItemLabel(s, booking), date: booking.date }));
  }

  const ctx: AppState = {
    hotel,
    lang: language.lang,
    s,
    userLocation: geo.location,
    savedIds: saves.savedIds,
    toggleSave: saves.toggle,
    saveMany: saves.saveMany,
    sendText,
    onBooked,
  };
  const tripCount = saves.savedIds.size + bookings.count;

  return (
    <AppProvider value={ctx}>
      <div className="flex min-h-dvh flex-col">
        {/* The page behind the open drawer is inert: no focus, no screen-reader access. */}
        <div inert={tripOpen} className="flex flex-1 flex-col">
          <Header
            tripCount={tripCount}
            onOpenTrip={() => setTripOpen(true)}
            onLanguage={language.change}
          />

          <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-36 sm:pb-24">
            {messages.length === 0 ? (
              <div className="-mx-4">
                <WelcomeScreen
                  ready={guest.hydrated}
                  profile={guest.profile}
                  onProfile={guest.setProfile}
                  onRequestLocation={geo.request}
                />
              </div>
            ) : (
              <MessageList
                messages={messages}
                busy={busy}
                awaitingFirstToken={status === "submitted"}
                error={error}
                onRetry={() => void regenerate({ body: requestBody })}
              />
            )}
          </main>

          <div className="fixed inset-x-0 bottom-0 z-30 bg-paper/95 backdrop-blur">
            <Composer busy={busy} onSend={sendText} />
            <BottomNav
              tripCount={tripCount}
              onOpenTrip={() => setTripOpen(true)}
              onLanguage={language.change}
            />
          </div>
        </div>

        <TripDrawer
          open={tripOpen}
          onClose={() => setTripOpen(false)}
          bookingsVersion={bookings.version}
        />
      </div>
    </AppProvider>
  );
}
