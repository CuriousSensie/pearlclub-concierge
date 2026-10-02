"use client";

import { useApp } from "./AppContext";

export function SuggestionChips({ suggestions }: { suggestions: string[] }) {
  const { sendText } = useApp();
  return (
    <div className="rise flex flex-wrap gap-2">
      {suggestions.map((text) => (
        <button
          key={text}
          type="button"
          onClick={() => sendText(text)}
          className="rounded-full border border-accent/40 bg-card px-3.5 py-1.5 text-sm text-accent"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
