"use client";

import { useApp } from "./AppContext";

export function SuggestionChips({ suggestions }: { suggestions: string[] }) {
  const { sendText } = useApp();
  return (
    <div className="rise flex flex-wrap gap-2">
      {suggestions.map((text) => (
        <button key={text} type="button" onClick={() => sendText(text)} className="pc-chip">
          {text}
        </button>
      ))}
    </div>
  );
}
