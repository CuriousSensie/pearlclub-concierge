"use client";

import { useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { useToast } from "../Toaster";
import { fill } from "@/lib/i18n";
import { sessionHeaders } from "@/lib/session";
import type { Booking, BookingFormData } from "@/types";

const CONTACT_KEY = "pc_guest_contact";

function readContact(): { name: string; email: string } {
  try {
    const raw = window.localStorage.getItem(CONTACT_KEY);
    if (raw) return JSON.parse(raw) as { name: string; email: string };
  } catch (err) {
    console.warn("could not read saved contact", err);
  }
  return { name: "", email: "" };
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA");
}

const inputCls = "h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm";

export function BookingFormCard({ form }: { form: BookingFormData }) {
  const { s, hotel, onBooked } = useApp();
  const toast = useToast();
  const [contact] = useState(readContact);
  const [values, setValues] = useState({
    date: form.suggested_date ?? tomorrow(),
    time: form.suggested_time ?? "",
    party_size: form.party_size ?? 1,
    guest_name: contact.name,
    guest_email: contact.email,
    room_number: "",
    notes: form.notes ?? "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof values>(key: K, v: (typeof values)[K]) =>
    setValues((p) => ({ ...p, [key]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders() },
        body: JSON.stringify({
          hotel_id: form.hotel_id,
          booking_type: form.booking_type,
          item_id: form.item_id,
          item_name: form.item_name,
          date: values.date,
          time: values.time || null,
          party_size: Number(values.party_size),
          guest_name: values.guest_name,
          guest_email: values.guest_email,
          room_number: values.room_number || null,
          notes: values.notes || null,
        }),
      });
      const data = (await res.json()) as { booking?: Booking; error?: string };
      if (!res.ok || !data.booking) {
        setError(data.error ?? s.errGeneric);
        setStatus("idle");
        return;
      }
      try {
        window.localStorage.setItem(
          CONTACT_KEY,
          JSON.stringify({ name: values.guest_name, email: values.guest_email }),
        );
      } catch (err) {
        console.warn("could not persist contact", err);
      }
      setStatus("sent");
      toast(s.toastBooked);
      onBooked(data.booking);
    } catch (err) {
      console.error("booking failed", err);
      setError(s.errGeneric);
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="rise rounded-2xl border border-accent/40 bg-card p-4">
        <p className="font-display text-xl text-accent">{s.fSent}</p>
        <p className="mt-1 text-sm">
          {form.item_name} · {values.date}
          {values.time && ` · ${values.time}`} · {values.party_size}
        </p>
        <p className="mt-1 text-sm text-muted">{s.fSentSub}</p>
      </div>
    );
  }

  const field = (label: string, control: React.ReactNode) => (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {control}
    </label>
  );

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow)]"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{s.bookTitle}</p>
        <h3 className="font-display text-xl leading-tight">{form.item_name}</h3>
        <p className="text-xs text-muted">{hotel.name}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field(
          s.fDate,
          <input
            type="date"
            required
            value={values.date}
            min={new Date().toLocaleDateString("en-CA")}
            onChange={(e) => set("date", e.target.value)}
            className={inputCls}
          />,
        )}
        {field(
          s.fTime,
          <input
            type="time"
            required={form.requires_time}
            value={values.time}
            onChange={(e) => set("time", e.target.value)}
            className={inputCls}
          />,
        )}
        {field(
          s.fParty,
          <input
            type="number"
            min={1}
            max={20}
            required
            value={values.party_size}
            onChange={(e) => set("party_size", Number(e.target.value))}
            className={inputCls}
          />,
        )}
        {field(
          s.fRoom,
          <input
            type="text"
            maxLength={20}
            value={values.room_number}
            onChange={(e) => set("room_number", e.target.value)}
            className={inputCls}
          />,
        )}
      </div>
      {field(
        s.fName,
        <input
          type="text"
          required
          autoComplete="name"
          value={values.guest_name}
          onChange={(e) => set("guest_name", e.target.value)}
          className={inputCls}
        />,
      )}
      {field(
        s.fEmail,
        <input
          type="email"
          required
          autoComplete="email"
          value={values.guest_email}
          onChange={(e) => set("guest_email", e.target.value)}
          className={inputCls}
        />,
      )}
      {field(
        s.fNotes,
        <textarea
          rows={2}
          maxLength={500}
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={`${inputCls} h-auto py-2`}
        />,
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-ink disabled:opacity-60"
      >
        {status === "sending" ? s.fSubmitting : s.fSubmit}
      </button>
      <p className="sr-only">
        {fill(s.bookingSubmitted, { item: form.item_name, date: values.date })}
      </p>
    </form>
  );
}
