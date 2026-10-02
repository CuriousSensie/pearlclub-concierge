"use client";

import { useApp } from "../AppContext";
import { ServiceGlyph } from "../icons";
import type { HotelServiceInfo } from "@/types";

export function HotelServicesCard({ services }: { services: HotelServiceInfo[] }) {
  const { s, sendText } = useApp();
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {services.map((svc) => {
        return (
          <li key={svc.id} className="flex gap-3 rounded-2xl border border-line bg-card p-3.5">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent-text">
              <ServiceGlyph name={svc.icon} aria-hidden className="size-5" strokeWidth={1.75} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-medium leading-snug">{svc.name}</h3>
                <span className="shrink-0 text-xs text-muted">{svc.price}</span>
              </div>
              <p className="text-sm leading-relaxed text-ink/75">{svc.description}</p>
              <button
                type="button"
                onClick={() => sendText(`I'd like to book ${svc.name}`)}
                className="mt-1.5 h-9 self-start rounded-full bg-accent px-4 text-sm font-medium text-accent-ink"
              >
                {s.request}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
