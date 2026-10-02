"use client";

import type { UIMessage } from "ai";
import clsx from "clsx";
import { Fragment, type ReactNode } from "react";
import { useApp } from "./AppContext";
import { BookingFormCard } from "./cards/BookingFormCard";
import { DayPlanCard } from "./cards/DayPlanCard";
import { HotelServicesCard } from "./cards/HotelServicesCard";
import { MapCard } from "./cards/MapCard";
import { PlaceCarousel } from "./cards/PlaceCarousel";
import { PlaceCard } from "./cards/PlaceCard";
import type { BookingFormData, DayPlanStop, HotelServiceInfo, Place, PlaceSummary } from "@/types";

/** Minimal markdown: **bold**, *italic*, [text](url), "- " lists, paragraphs. */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={m.index}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("[")) {
      const [, label, url] = tok.match(/\[([^\]]+)\]\(([^)]+)\)/) ?? [];
      parts.push(
        <a key={m.index} href={url} target="_blank" rel="noopener noreferrer">
          {label}
        </a>,
      );
    } else parts.push(<em key={m.index}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="prose-chat">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Skeleton() {
  return <div aria-hidden className="h-40 w-full animate-pulse rounded-2xl bg-line/70" />;
}

type ToolPart = { type: string; state?: string; output?: unknown; errorText?: string };

/** Renders a tool part as a card; returns null for tools that render nothing (and for errors). */
function ToolView({ part }: { part: ToolPart }) {
  const { hotel } = useApp();
  const name = part.type.replace(/^tool-/, "");
  const running = part.state === "input-streaming" || part.state === "input-available";
  const cardTools = [
    "search_places",
    "plan_day",
    "show_map",
    "propose_booking",
    "get_hotel_services",
    "get_place_details",
  ];

  if (running) return cardTools.includes(name) ? <Skeleton /> : null;
  if (part.state !== "output-available") return null;

  const out = (part.output ?? {}) as Record<string, unknown>;
  if (typeof out.error === "string") return null;

  switch (name) {
    case "search_places": {
      const places = (out.places ?? []) as PlaceSummary[];
      return places.length ? <PlaceCarousel places={places} /> : null;
    }
    case "get_place_details": {
      const place = out.place as Place | undefined;
      return place ? <PlaceCard place={place} compact /> : null;
    }
    case "show_map": {
      const places = (out.places ?? []) as Place[];
      return places.length ? <MapCard places={places} /> : null;
    }
    case "plan_day":
      return (
        <DayPlanCard
          plan={(out.plan ?? []) as DayPlanStop[]}
          theme={out.theme as string | undefined}
          date={out.date as string | undefined}
        />
      );
    case "propose_booking":
      return out.form ? (
        <BookingFormCard
          form={{
            ...(out.form as BookingFormData),
            hotel_id: (out.form as BookingFormData).hotel_id ?? hotel.id,
          }}
        />
      ) : null;
    case "get_hotel_services":
      return <HotelServicesCard services={(out.services ?? []) as HotelServiceInfo[]} />;
    default:
      return null;
  }
}

export function MessageBubble({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <div className="rise flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-ee-md bg-accent px-4 py-2.5 text-[15px] text-accent-ink">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className={clsx("rise space-y-3")}>
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return part.text.trim() ? (
            <div
              key={i}
              className="max-w-[92%] rounded-2xl rounded-es-md border border-line bg-card px-4 py-2.5 text-[15px] leading-relaxed"
            >
              <Markdown text={part.text} />
            </div>
          ) : null;
        }
        if (part.type.startsWith("tool-")) return <ToolView key={i} part={part as ToolPart} />;
        return null;
      })}
    </div>
  );
}

/** Extracts follow-up suggestions from a message's suggest_followups tool result. */
export function getSuggestions(message: UIMessage | undefined): string[] {
  if (!message || message.role !== "assistant") return [];
  for (const part of message.parts) {
    const p = part as ToolPart;
    if (p.type === "tool-suggest_followups" && p.state === "output-available") {
      const s = (p.output as { suggestions?: string[] } | undefined)?.suggestions;
      if (Array.isArray(s)) return s;
    }
  }
  return [];
}
