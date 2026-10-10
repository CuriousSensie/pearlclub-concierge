"use client";

/**
 * Last-resort boundary for errors in the root layout. It replaces the whole document, so it must
 * render its own <html> and cannot rely on the app's fonts or stylesheet.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          background: "#f9fafb",
          color: "#020817",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 500 }}>
          Sorry, something went wrong :(
        </h1>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "#121113",
            color: "#fff",
            border: "1px solid #1f2937",
            borderRadius: 4,
            padding: "8px 16px",
            fontSize: 16,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
