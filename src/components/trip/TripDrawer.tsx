"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useApp } from "@/components/chat/ConciergeContext";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { sessionHeaders } from "@/client/session";
import type { Booking, Place } from "@/lib/types";

type Tab = "saved" | "bookings";

export function TripDrawer({
  open,
  onClose,
  bookingsVersion,
}: {
  open: boolean;
  onClose: () => void;
  bookingsVersion: number;
}) {
  const { s, savedIds } = useApp();
  const [tab, setTab] = useState<Tab>("saved");
  const [places, setPlaces] = useState<Place[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/saves", { headers: sessionHeaders() }).then(
        (r) => r.json() as Promise<{ places?: Place[] }>,
      ),
      fetch("/api/bookings", { headers: sessionHeaders() }).then(
        (r) => r.json() as Promise<{ bookings?: Booking[] }>,
      ),
    ])
      .then(([saved, booked]) => {
        if (cancelled) return;
        setPlaces(saved.places ?? []);
        setBookings(booked.bookings ?? []);
        setFailed(false);
      })
      .catch((err) => {
        console.error("trip load failed", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, savedIds, bookingsVersion]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={clsx("fixed inset-0 z-50", open ? "" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={clsx(
          "absolute inset-0 bg-black/40 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={s.myTrip}
        className={clsx(
          "absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-paper shadow-[var(--shadow-card)] transition-transform duration-300",
          open ? "translate-x-0" : "ltr:translate-x-full rtl:-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 className="pc-title text-xl">{s.myTrip}</h2>
          <button type="button" onClick={onClose} className="pc-chip">
            {s.close}
          </button>
        </div>
        <div role="tablist" className="flex gap-2 px-4 py-3">
          {(["saved", "bookings"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className="pc-chip"
              data-active={tab === t}
            >
              {t === "saved"
                ? `${s.savedTab} (${places.length})`
                : `${s.bookingsTab} (${bookings.length})`}
            </button>
          ))}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {failed && <p className="text-sm text-red-600">{s.errGeneric}</p>}
          {tab === "saved" &&
            (places.length ? (
              places.map((p) => <PlaceCard key={p.id} place={p} variant="row" />)
            ) : (
              <p className="py-10 text-center text-sm text-muted">{s.emptySaved}</p>
            ))}
          {tab === "bookings" &&
            (bookings.length ? (
              bookings.map((b) => (
                <div key={b.id} className="pc-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="pc-title text-base">{b.item_name}</h3>
                    <span className="pc-strip shrink-0 rounded-full px-2.5 py-0.5 text-xs capitalize">
                      {b.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {b.date}
                    {b.time && ` · ${b.time}`} · {b.party_size} · {b.guest_name}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-muted">{s.emptyBookings}</p>
            ))}
        </div>
      </aside>
    </div>
  );
}
