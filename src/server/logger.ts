import "server-only";

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

// Read directly (not via env()) so logging works even when configuration is what failed to load.
const threshold = (): number => {
  if (process.env.NODE_ENV === "test") return Infinity;
  const level = process.env.LOG_LEVEL as Level | undefined;
  return ORDER[level ?? "info"] ?? ORDER.info;
};

const serialiseError = (err: unknown) =>
  err instanceof Error
    ? { name: err.name, message: err.message, stack: err.stack }
    : { value: String(err) };

function write(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  if (ORDER[level] < threshold()) return;
  const { err, ...rest } = fields;
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...rest,
    ...(err === undefined ? {} : { err: serialiseError(err) }),
  });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

/** One JSON line per event, easy to filter in Vercel logs. Pass `err` to include a serialised error. */
export const log = {
  debug: (event: string, fields?: Record<string, unknown>) => write("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
};
