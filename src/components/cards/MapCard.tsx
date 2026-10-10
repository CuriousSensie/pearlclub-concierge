"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/chat/ConciergeContext";
import type { Place } from "@/lib/types";

const FALLBACK_STYLE = "https://demotiles.maplibre.org/style.json";

function styleUrl(): string {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  return key ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}` : FALLBACK_STYLE;
}

/** Interactive map of places. With `numbered`, markers are numbered and joined by a route line. */
export function MapCard({
  places,
  numbered = false,
  height = 260,
}: {
  places: Place[];
  numbered?: boolean;
  height?: number;
}) {
  const { hotel } = useApp();
  const container = useRef<HTMLDivElement>(null);
  const withCoords = places.filter((p) => p.lat != null && p.lng != null);

  useEffect(() => {
    const el = container.current;
    if (!el || !withCoords.length) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void import("maplibre-gl")
      .then((maplibregl) => {
        // Bundlers break MapLibre's auto-detected worker; serve it from /public instead.
        maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        if (cancelled) return;
        const map = new maplibregl.Map({
          container: el,
          style: styleUrl(),
          center: [withCoords[0].lng as number, withCoords[0].lat as number],
          zoom: 12,
          attributionControl: { compact: true },
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

        const bounds = new maplibregl.LngLatBounds();

        const hotelEl = document.createElement("div");
        hotelEl.className =
          "h-6 w-6 rounded-md border-2 border-white bg-[var(--black)] text-white shadow";
        hotelEl.innerHTML =
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:3px"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></svg>'; // static markup, no user input
        hotelEl.title = hotel.name;
        new maplibregl.Marker({ element: hotelEl }).setLngLat([hotel.lng, hotel.lat]).addTo(map);

        withCoords.forEach((p, i) => {
          const lngLat: [number, number] = [p.lng as number, p.lat as number];
          bounds.extend(lngLat);
          const pin = document.createElement("div");
          pin.className =
            "flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-[var(--black)] px-1 text-xs font-semibold text-white shadow";
          pin.textContent = numbered ? String(i + 1) : "";
          pin.setAttribute("aria-label", p.name);

          const popup = document.createElement("div");
          const title = document.createElement("strong");
          title.textContent = p.name;
          const link = document.createElement("a");
          link.href = p.pearlclub_url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Pearl Club ↗";
          link.style.cssText =
            "display:block;color:#121113;text-decoration:underline;margin-top:2px";
          popup.append(title, link);
          popup.style.cssText = "color:#14202b;font-size:13px";

          new maplibregl.Marker({ element: pin })
            .setLngLat(lngLat)
            .setPopup(new maplibregl.Popup({ offset: 18 }).setDOMContent(popup))
            .addTo(map);
        });

        map.on("load", () => {
          if (numbered && withCoords.length > 1) {
            map.addSource("route", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: withCoords.map((p) => [p.lng as number, p.lat as number]),
                },
              },
            });
            map.addLayer({
              id: "route",
              type: "line",
              source: "route",
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": "#121113", "line-width": 3, "line-dasharray": [2, 1.5] },
            });
          }
        });

        bounds.extend([hotel.lng, hotel.lat]);
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
        cleanup = () => map.remove();
      })
      .catch((err) => console.error("map failed to load", err));

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // Re-create the map only when the set of places changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withCoords.map((p) => p.id).join(","), numbered, hotel.id]);

  if (!withCoords.length) return null;
  return (
    <div
      ref={container}
      role="region"
      aria-label="Map"
      style={{ height }}
      className="pc-card w-full overflow-hidden bg-strip"
    />
  );
}
