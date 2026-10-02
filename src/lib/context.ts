import "server-only";
import type { Hotel } from "./hotels";

export type PartOfDay = "morning" | "lunch" | "afternoon" | "evening" | "night";
export type Sky = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";

export type Weather = { tempC: number; sky: Sky; rainy: boolean; description: string };
export type LiveContext = {
  partOfDay: PartOfDay;
  weekday: string;
  localTime: string;
  weather: Weather | null;
};

const CACHE_MS = 15 * 60_000;
const weatherCache = new Map<string, { at: number; value: Weather | null }>();

/** WMO weather code -> sky + plain-English description. */
function describeCode(code: number): { sky: Sky; description: string } {
  if (code === 0) return { sky: "clear", description: "clear" };
  if (code <= 3) return { sky: "cloudy", description: code === 3 ? "overcast" : "partly cloudy" };
  if (code === 45 || code === 48) return { sky: "fog", description: "foggy" };
  if (code <= 57) return { sky: "rain", description: "drizzle" };
  if (code <= 67) return { sky: "rain", description: "rain" };
  if (code <= 77) return { sky: "snow", description: "snow" };
  if (code <= 82) return { sky: "rain", description: "showers" };
  if (code <= 86) return { sky: "snow", description: "snow showers" };
  return { sky: "storm", description: "thunderstorms" };
}

/** Current conditions from Open-Meteo (free, no key). Returns null on any failure. */
export async function getWeather(lat: number, lng: number): Promise<Weather | null> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = weatherCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  let value: Weather | null = null;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code&hourly=precipitation_probability&forecast_days=1&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = (await res.json()) as {
      current: { time: string; temperature_2m: number; weather_code: number };
      hourly: { time: string[]; precipitation_probability: number[] };
    };
    const { sky, description } = describeCode(data.current.weather_code);
    const startIdx = Math.max(
      0,
      data.hourly.time.findIndex((t) => t >= data.current.time.slice(0, 13)),
    );
    const nextHours = data.hourly.precipitation_probability.slice(startIdx, startIdx + 6);
    const rainSoon = Math.max(0, ...nextHours) >= 60;
    value = {
      tempC: Math.round(data.current.temperature_2m),
      sky,
      rainy: sky === "rain" || sky === "storm" || rainSoon,
      description,
    };
  } catch (err) {
    console.warn("weather lookup failed", err);
  }
  weatherCache.set(key, { at: Date.now(), value });
  return value;
}

export function partOfDayAt(timezone: string, now: Date): PartOfDay {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: timezone,
    }).format(now),
  );
  if (hour >= 5 && hour < 11) return "morning";
  if (hour < 15 && hour >= 11) return "lunch";
  if (hour >= 15 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

export async function getLiveContext(hotel: Hotel, now = new Date()): Promise<LiveContext> {
  const weather = await getWeather(hotel.lat, hotel.lng);
  return {
    partOfDay: partOfDayAt(hotel.timezone, now),
    weekday: new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: hotel.timezone }).format(
      now,
    ),
    localTime: new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: hotel.timezone,
    }).format(now),
    weather,
  };
}
