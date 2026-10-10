"use client";

import { useApp } from "@/components/chat/ConciergeContext";
import { serviceEmoji } from "@/components/ui/emoji";
import type { HotelServiceInfo } from "@/lib/types";

export function HotelServicesCard({ services }: { services: HotelServiceInfo[] }) {
  const { s, sendText } = useApp();
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
              <h3 className="pc-title text-base leading-snug">{svc.name}</h3>
              <span className="shrink-0 rounded-md border border-slate-300 px-1.5 text-[13px] leading-5 text-slate-400">
                {svc.price}
              </span>
            </div>
            <p className="text-sm leading-5 text-muted">{svc.description}</p>
            <button
              type="button"
              onClick={() => sendText(`I'd like to book ${svc.name}`)}
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
