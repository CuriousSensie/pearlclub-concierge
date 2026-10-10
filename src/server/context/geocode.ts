import "server-only";

const HIT_MS = 60 * 60_000;
const MISS_MS = 60_000; // retry failures soon: the free geocoders are occasionally slow
const cache = new Map<string, { at: number; ttl: number; label: string | null }>();

async function viaNominatim(lat: number, lng: number): Promise<string | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=en&lat=${lat}&lon=${lng}`,
    {
      headers: { "user-agent": "PearlClubConciergeMVP/0.1 (assessment project)" },
      signal: AbortSignal.timeout(2500),
    },
  );
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const a = ((await res.json()) as { address?: Record<string, string> }).address ?? {};
  return a.suburb ?? a.neighbourhood ?? a.city_district ?? a.quarter ?? a.village ?? a.town ?? null;
}

async function viaBigDataCloud(lat: number, lng: number): Promise<string | null> {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    { signal: AbortSignal.timeout(2500) },
  );
  if (!res.ok) throw new Error(`BigDataCloud HTTP ${res.status}`);
  const d = (await res.json()) as { locality?: string; city?: string };
  return (d.locality || d.city || "").replace(/^Royal\s+/, "") || null;
}

/** The neighbourhood name (e.g. "Brompton") for a coordinate. Free geocoders, cached, null on failure. */
export async function areaName(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.label;

  let label: string | null = null;
  for (const lookup of [viaNominatim, viaBigDataCloud]) {
    try {
      label = await lookup(lat, lng);
      if (label) break;
    } catch (err) {
      console.warn(
        `reverse geocode (${lookup.name}) failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), ttl: label ? HIT_MS : MISS_MS, label });
  return label;
}
