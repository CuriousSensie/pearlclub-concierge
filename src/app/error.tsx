"use client";

import { useEffect } from "react";

/** Route-level error boundary: a calm message in Pearl Club's voice with a way to retry. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("route error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="font-display text-4xl italic leading-tight">Sorry, something went wrong :(</h1>
      <p className="text-muted">The concierge hit a problem. Please try again.</p>
      <button type="button" onClick={reset} className="pc-btn">
        Try again
      </button>
    </main>
  );
}
