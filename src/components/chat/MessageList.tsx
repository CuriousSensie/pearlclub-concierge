"use client";

import { useEffect } from "react";
import { useApp } from "@/components/chat/ConciergeContext";
import { MessageBubble, getSuggestions } from "@/components/chat/MessageBubble";
import { SuggestionChips } from "@/components/chat/SuggestionChips";
import { classifyChatError } from "@/client/chatError";
import type { ConciergeUIMessage } from "@/client/chatTypes";

export function MessageList({
  messages,
  busy,
  awaitingFirstToken,
  error,
  onRetry,
}: {
  messages: ConciergeUIMessage[];
  busy: boolean;
  /** True between sending and the first streamed chunk. */
  awaitingFirstToken: boolean;
  error: Error | undefined;
  onRetry: () => void;
}) {
  const { s } = useApp();

  // Keep the newest question at the top so the answer reads top-down, cards first.
  const lastUserId = messages.findLast((m) => m.role === "user")?.id;
  useEffect(() => {
    if (!lastUserId) return;
    document
      .getElementById(`msg-${lastUserId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [lastUserId]);

  const suggestions =
    !busy && messages.at(-1)?.role === "assistant" ? getSuggestions(messages.at(-1)) : [];
  const errorKind = error ? classifyChatError(error.message) : null;
  const errorText = {
    daily: s.errDaily,
    limit: s.errLimit,
    busy: s.errBusy,
    generic: s.errGeneric,
  };

  return (
    <div className="space-y-4 py-4">
      {messages.map((m) => (
        <div key={m.id} id={`msg-${m.id}`} className="scroll-mt-20">
          <MessageBubble message={m} />
        </div>
      ))}
      {awaitingFirstToken && (
        <div role="status" className="flex items-center gap-2.5 py-1">
          <span aria-hidden className="dot-pulse">
            <span />
            <span />
            <span />
          </span>
          <span className="sr-only">{s.thinking}</span>
        </div>
      )}
      {suggestions.length > 0 && <SuggestionChips suggestions={suggestions} />}
      {errorKind && (
        <div role="alert" className="pc-card space-y-3 p-4">
          <p className="font-display text-xl italic leading-snug">{errorText[errorKind]}</p>
          {(errorKind === "busy" || errorKind === "generic") && (
            <button type="button" onClick={onRetry} className="pc-btn pc-btn-sm">
              {s.retry}
            </button>
          )}
        </div>
      )}
      {/* Room below the answer so the newest question can sit at the top of the viewport. */}
      <div aria-hidden className="h-[45vh]" />
    </div>
  );
}
