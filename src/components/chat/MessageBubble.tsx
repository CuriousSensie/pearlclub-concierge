"use client";

import { BookingFormCard } from "@/components/cards/BookingFormCard";
import { DayPlanCard } from "@/components/cards/DayPlanCard";
import { HotelServicesCard } from "@/components/cards/HotelServicesCard";
import { MapCard } from "@/components/cards/MapCard";
import { PlaceCard } from "@/components/cards/PlaceCard";
import { PlaceCarousel } from "@/components/cards/PlaceCarousel";
import { useApp } from "@/components/chat/ConciergeContext";
import { Markdown } from "@/components/chat/Markdown";
import type { ConciergeUIMessage } from "@/client/chatTypes";

type Part = ConciergeUIMessage["parts"][number];

const isRunning = (state: string): boolean =>
  state === "input-streaming" || state === "input-available";

function Skeleton() {
  return (
    <div
      aria-hidden
      className="h-56 w-4/5 animate-pulse rounded-3xl bg-strip motion-reduce:animate-none"
    />
  );
}

/** Shown while a card-producing tool runs: what is happening, plus a placeholder. */
function Progress({ label }: { label: string }) {
  return (
    <div role="status" className="space-y-2">
      <p className="flex items-center gap-2.5 text-sm text-muted">
        <span aria-hidden className="dot-pulse">
          <span />
          <span />
          <span />
        </span>
        {label}
      </p>
      <Skeleton />
    </div>
  );
}

/** Renders a tool call as a card. Tool outputs are typed from the server's tool definitions. */
function ToolView({ part }: { part: Part }) {
  const { s } = useApp();

  switch (part.type) {
    case "tool-search_places":
      if (isRunning(part.state)) return <Progress label={s.progSearch} />;
      if (part.state !== "output-available" || !part.output.places.length) return null;
      return <PlaceCarousel places={part.output.places} />;

    case "tool-get_place_details":
      if (part.state !== "output-available" || !part.output.place) return null;
      return <PlaceCard place={part.output.place} variant="row" />;

    case "tool-show_map":
      if (isRunning(part.state)) return <Progress label={s.progMap} />;
      if (part.state !== "output-available" || !part.output.places) return null;
      return <MapCard places={part.output.places} />;

    case "tool-plan_day":
      if (isRunning(part.state)) return <Progress label={s.planning} />;
      if (part.state !== "output-available" || "error" in part.output) return null;
      return (
        <DayPlanCard
          plan={part.output.plan}
          rainy={part.output.rainy}
          theme={part.output.theme}
          date={part.output.date}
        />
      );

    case "tool-propose_booking":
      if (isRunning(part.state)) return <Progress label={s.progBook} />;
      if (part.state !== "output-available" || !part.output.form) return null;
      return <BookingFormCard form={part.output.form} />;

    case "tool-get_hotel_services":
      if (isRunning(part.state)) return <Progress label={s.progServices} />;
      if (part.state !== "output-available") return null;
      return <HotelServicesCard services={part.output.services} />;

    default:
      // save_preferences and suggest_followups render nothing here (chips are shown under the list).
      return null;
  }
}

export function MessageBubble({ message }: { message: ConciergeUIMessage }) {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <div className="rise flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-ee-md bg-[var(--black)] px-4 py-2.5 text-[15px] leading-snug text-white">
          {text}
        </p>
      </div>
    );
  }

  const hasPlan = message.parts.some((p) => p.type === "tool-plan_day");

  return (
    <div className="rise space-y-3">
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return part.text.trim() ? (
            <div key={i} className="max-w-[62ch] text-[16px] leading-[1.6]">
              <Markdown text={part.text} />
            </div>
          ) : null;
        }
        // A plan card replaces any exploratory searches the model made while building it.
        if (part.type === "tool-search_places" && hasPlan) return null;
        return <ToolView key={i} part={part} />;
      })}
    </div>
  );
}

/** The follow-up suggestions from the latest assistant message, if it produced any. */
export function getSuggestions(message: ConciergeUIMessage | undefined): string[] {
  if (message?.role !== "assistant") return [];
  for (const part of message.parts) {
    if (part.type === "tool-suggest_followups" && part.state === "output-available") {
      return part.output.suggestions;
    }
  }
  return [];
}
