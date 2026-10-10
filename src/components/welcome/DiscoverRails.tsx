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
import { PlaceCard } from "@/components/cards/PlaceCard";
import { useApp } from "@/components/chat/ConciergeContext";
import { api } from "@/client/api";
import type { DiscoverResponse, Rail, Sky } from "@/lib/types";

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
  const { hotel, lang, s, userLocation } = useApp();
  const [data, setData] = useState<DiscoverResponse | null>(null);
  const lat = userLocation?.lat;
  const lng = userLocation?.lng;

  useEffect(() => {
    const params = new URLSearchParams({ hotel: hotel.id });
    if (lat != null && lng != null) {
      params.set("lat", lat.toFixed(3));
      params.set("lng", lng.toFixed(3));
    }
    const ctrl = new AbortController();
    api
      .discover(params, ctrl.signal)
      .then(setData)
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("discover failed", err);
        }
      });
    return () => ctrl.abort();
  }, [hotel.id, lat, lng]);

  if (!data) {
    return (
      <div
        aria-hidden
        className="h-72 animate-pulse rounded-3xl bg-strip motion-reduce:animate-none"
      />
    );
  }

  const { weather, partOfDay, location } = data.context;
  const WeatherIcon = weather ? SKY_ICON[weather.sky] : null;
  // Formatted here (not on the server) so it follows the guest's chosen language.
  const weekdayName = new Intl.DateTimeFormat(lang, {
    weekday: "long",
    timeZone: hotel.timezone,
  }).format(new Date());

  const title = (rail: Rail): string =>
    rail.kind === "now"
      ? rail.rainy
        ? s.railRain
        : s.railNow[rail.part]
      : rail.kind === "local"
        ? s.railLocal
        : s.railBudget;

  return (
    <section className="space-y-7">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="pc-chip min-h-8 text-[13px]">
          <MapPin aria-hidden className="size-3.5" strokeWidth={1.75} />
          {location.label}
        </span>
        {WeatherIcon && weather && (
          <span className="pc-chip min-h-8 text-[13px]">
            <WeatherIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
            {weather.tempC}° {s.sky[weather.sky]}
          </span>
        )}
        <span className="pc-chip min-h-8 text-[13px]">
          {weekdayName} {s.part[partOfDay]}
        </span>
      </div>
      {data.rails.map((rail) => (
        <div key={rail.kind} className="space-y-3">
          <h3 className="pc-title text-lg">{title(rail)}</h3>
          <div className="scroll-snap-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 pt-1 sm:mx-0 sm:px-0">
            {rail.places.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
