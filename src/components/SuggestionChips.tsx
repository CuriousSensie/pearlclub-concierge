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
          className="rounded-full border border-accent/35 bg-card px-4 py-2 text-sm text-accent-text transition-colors hover:bg-accent/8"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
