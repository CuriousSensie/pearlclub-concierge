"use client";

import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  MapPin,
  Snowflake,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "./AppContext";
import { PlaceCard } from "./cards/PlaceCard";
import type { PlaceSummary } from "@/types";

type Part = "morning" | "lunch" | "afternoon" | "evening" | "night";
type Sky = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";
type Rail = {
  kind: "now" | "local" | "budget";
  part: Part;
  rainy: boolean;
  places: PlaceSummary[];
};
type Discover = {
  context: {
    partOfDay: Part;
    weekday: string;
    weather: { tempC: number; sky: Sky } | null;
    location: { label: string; shared: boolean };
  };
  rails: Rail[];
};

const SKY_ICON: Record<Sky, LucideIcon> = {
  clear: Sun,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: Snowflake,
  storm: CloudLightning,
};

/** Instant, model-free content for the first screen: live weather and rails of real places. */
export function DiscoverRails() {
  const { hotel, s, userLocation } = useApp();
  const [data, setData] = useState<Discover | null>(null);
  const lat = userLocation?.lat;
  const lng = userLocation?.lng;

  useEffect(() => {
    const params = new URLSearchParams({ hotel: hotel.id });
    if (lat != null && lng != null) {
      params.set("lat", lat.toFixed(3));
      params.set("lng", lng.toFixed(3));
    }
    const query = params.toString();
    const ctrl = new AbortController();
    fetch(`/api/discover?${query}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Discover>) : null))
      .then((d) => d && setData(d))
      .catch((err) => {
        if ((err as Error).name !== "AbortError") console.error("discover failed", err);
      });
    return () => ctrl.abort();
  }, [hotel.id, lat, lng]);

  if (!data) {
    return (
      <div
        aria-hidden
        className="h-72 animate-pulse rounded-2xl bg-line/50 motion-reduce:animate-none"
      />
    );
  }

  const { weather, partOfDay, weekday } = data.context;
  const WeatherIcon = weather ? SKY_ICON[weather.sky] : null;
  const title = (r: Rail): string =>
    r.kind === "now"
      ? r.rainy
        ? s.railRain
        : s.railNow[r.part]
      : r.kind === "local"
        ? s.railLocal
        : s.railBudget;

  return (
    <section className="space-y-6">
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <MapPin
            aria-hidden
            className={`size-4 ${data.context.location.shared ? "text-accent-text" : ""}`}
            strokeWidth={1.75}
          />
          {data.context.location.label}
        </span>
        {WeatherIcon && weather && (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <WeatherIcon aria-hidden className="size-4" strokeWidth={1.75} />
              {weather.tempC}° {s.sky[weather.sky]}
            </span>
          </>
        )}
        <span aria-hidden>·</span>
        <span>
          {weekday} {s.part[partOfDay]}
        </span>
      </p>
      {data.rails.map((rail) => (
        <div key={rail.kind} className="space-y-3">
          <h3 className="font-display text-2xl">{title(rail)}</h3>
          <div className="scroll-snap-row -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {rail.places.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
