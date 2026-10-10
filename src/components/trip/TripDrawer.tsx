"use client";

import clsx from "clsx";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { api } from "@/client/api";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { useApp } from "@/components/chat/ConciergeContext";
import { bookedItemLabel } from "@/lib/services";
import type { Booking, Place } from "@/lib/types";

type Tab = "saved" | "bookings";
const TABS: Tab[] = ["saved", "bookings"];
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const panelRef = useRef<HTMLElement>(null);
  const baseId = useId();
  const tabId = (t: Tab) => `${baseId}-tab-${t}`;
  const panelId = (t: Tab) => `${baseId}-panel-${t}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([api.saves.list(), api.bookings.list()])
      .then(([saved, booked]) => {
        if (cancelled) return;
        setPlaces(saved);
        setBookings(booked);
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

  // Dialog behaviour: move focus in, lock page scroll, and put focus back where it was on close.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open]);

  const onPanelKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Keep Tab / Shift+Tab inside the dialog.
      const items = [...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>, current: Tab) {
    const index = TABS.indexOf(current);
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? TABS[(index + 1) % TABS.length]
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? TABS[(index - 1 + TABS.length) % TABS.length]
          : e.key === "Home"
            ? TABS[0]
            : e.key === "End"
              ? TABS[TABS.length - 1]
              : null;
    if (!next) return;
    e.preventDefault();
    setTab(next);
    document.getElementById(tabId(next))?.focus();
  }

  return (
    <div
      className={clsx("fixed inset-0 z-50", open ? "" : "pointer-events-none")}
      // Closed drawers are inert so their off-screen controls cannot be reached by keyboard.
      inert={!open}
    >
      <div
        onClick={onClose}
        aria-hidden
        className={clsx(
          "absolute inset-0 bg-black/40 transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={s.myTrip}
        onKeyDown={onPanelKeyDown}
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
        <div role="tablist" aria-label={s.myTrip} className="flex gap-2 px-4 py-3">
          {TABS.map((t) => (
            <button
              key={t}
              id={tabId(t)}
              role="tab"
              type="button"
              aria-selected={tab === t}
              aria-controls={panelId(t)}
              tabIndex={tab === t ? 0 : -1}
              data-active={tab === t}
              onClick={() => setTab(t)}
              onKeyDown={(e) => onTabKeyDown(e, t)}
              className="pc-chip"
            >
              {t === "saved"
                ? `${s.savedTab} (${places.length})`
                : `${s.bookingsTab} (${bookings.length})`}
            </button>
          ))}
        </div>
        <div
          id={panelId(tab)}
          role="tabpanel"
          aria-labelledby={tabId(tab)}
          className="flex-1 space-y-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {failed && (
            <p role="alert" className="text-sm text-red-700">
              {s.errGeneric}
            </p>
          )}
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
                    <h3 className="pc-title text-base">{bookedItemLabel(s, b)}</h3>
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
