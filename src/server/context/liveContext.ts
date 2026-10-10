import "server-only";
import type { Hotel } from "@/lib/hotels";
import type { PartOfDay } from "@/lib/types";
import { getWeather, type Weather } from "./weather";

export type LiveContext = {
  partOfDay: PartOfDay;
  weekday: string;
  localTime: string;
  weather: Weather | null;
};

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

export async function getLiveContext(
  hotel: Hotel,
  now = new Date(),
  at: { lat: number; lng: number } = hotel,
): Promise<LiveContext> {
  const weather = await getWeather(at.lat, at.lng);
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
