"use client";

import { Map as MapIcon } from "lucide-react";
import { useState } from "react";
import { useApp } from "../AppContext";
import { MapCard } from "./MapCard";
import { PlaceCard } from "./PlaceCard";
import type { PlaceSummary } from "@/types";

export function PlaceCarousel({
  places,
  showMapButton = true,
}: {
  places: PlaceSummary[];
  showMapButton?: boolean;
}) {
  const { s } = useApp();
  const [mapOpen, setMapOpen] = useState(false);
  const hasCoords = places.some((p) => p.lat != null && p.lng != null);

  return (
    <div className="space-y-3">
      <div className="scroll-snap-row -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
        {places.map((p) => (
          <PlaceCard key={p.id} place={p} />
        ))}
      </div>
      {showMapButton && hasCoords && (
        <>
          <button
            type="button"
            aria-expanded={mapOpen}
            onClick={() => setMapOpen((o) => !o)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium"
          >
            <MapIcon aria-hidden className="size-4" />
            {mapOpen ? s.hideMap : s.showOnMap}
          </button>
          {mapOpen && <MapCard places={places} />}
        </>
      )}
    </div>
  );
}
