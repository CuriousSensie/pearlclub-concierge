"use client";

import { useApp } from "../AppContext";
import type { HotelServiceInfo } from "@/types";

export function HotelServicesCard({ services }: { services: HotelServiceInfo[] }) {
  const { s, sendText } = useApp();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((svc) => (
        <div
          key={svc.id}
          className="flex flex-col gap-1.5 rounded-2xl border border-line bg-card p-3.5 shadow-[var(--shadow)]"
        >
          <div className="flex items-start gap-2">
            <span aria-hidden className="text-2xl">
              {svc.icon}
            </span>
            <div className="min-w-0">
              <h3 className="font-medium leading-tight">{svc.name}</h3>
              <p className="text-xs text-muted">{svc.price}</p>
            </div>
          </div>
          <p className="text-sm text-ink/80">{svc.description}</p>
          <button
            type="button"
            onClick={() => sendText(`I'd like to book ${svc.name}`)}
            className="mt-auto h-9 self-start rounded-full bg-accent px-4 text-sm font-medium text-accent-ink"
          >
            {s.request}
          </button>
        </div>
      ))}
    </div>
  );
}
