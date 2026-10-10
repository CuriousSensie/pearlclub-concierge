"use client";

import { ArrowUp } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useApp } from "@/components/chat/ConciergeContext";
import { LIMITS } from "@/lib/domain";

/** The message field: a gradient-ring pill with a round send button. */
export function Composer({ busy, onSend }: { busy: boolean; onSend: (text: string) => void }) {
  const { s } = useApp();
  const [input, setInput] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !input.trim()) return;
    onSend(input);
    setInput("");
  }

  return (
    <form onSubmit={submit} className="px-4 pb-4 pt-3 sm:pb-3">
      <div className="pc-ring mx-auto max-w-3xl">
        <label className="relative flex items-center rounded-full bg-white">
          <span className="sr-only">{s.placeholder}</span>
          <input
            id="composer"
            value={input}
            maxLength={LIMITS.inputChars}
            onChange={(e) => setInput(e.target.value)}
            placeholder={s.placeholder}
            autoComplete="off"
            enterKeyHint="send"
            className="h-11 w-full rounded-full bg-transparent ps-5 pe-14 text-base placeholder:text-muted"
          />
          <button
            type="submit"
            aria-label={s.send}
            disabled={busy || !input.trim()}
            className="absolute end-1 top-1 inline-flex size-9 items-center justify-center rounded-full bg-[image:var(--gradient)] text-white transition-opacity disabled:opacity-30"
          >
            <ArrowUp aria-hidden className="size-5" />
          </button>
        </label>
      </div>
    </form>
  );
}
