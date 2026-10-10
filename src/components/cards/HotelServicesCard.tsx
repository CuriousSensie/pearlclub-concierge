"use client";

import { useApp } from "@/components/chat/ConciergeContext";
import { serviceEmoji } from "@/components/ui/emoji";
import type { HotelService } from "@/lib/hotels";
import { fill } from "@/lib/i18n";
import { serviceDescription, serviceName, servicePrice } from "@/lib/services";

export function HotelServicesCard({ services }: { services: HotelService[] }) {
  const { s, hotel, sendText } = useApp();
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {services.map((svc) => (
        <li key={svc.id} className="pc-card flex gap-3 p-4">
          <span
            aria-hidden
            className="pc-strip inline-flex size-11 shrink-0 items-center justify-center rounded-full text-2xl"
          >
            {serviceEmoji(svc.icon)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="pc-title text-base leading-snug">{serviceName(s, svc.id)}</h3>
              <span className="shrink-0 rounded-md border border-slate-300 px-1.5 text-[13px] leading-5 text-slate-500">
                {servicePrice(s, svc)}
              </span>
            </div>
            <p className="text-sm leading-5 text-muted">{serviceDescription(s, svc.id, hotel)}</p>
            <button
              type="button"
              onClick={() => sendText(fill(s.bookPrompt, { item: serviceName(s, svc.id) }))}
              className="pc-btn pc-btn-sm mt-1 self-start"
            >
              {s.request}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
