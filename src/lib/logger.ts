/**
 * Minimal structured (JSON-line) logger. In production emits one JSON object per line
 * (easy to ship to any log aggregator); in dev prints a compact human line. Never logs
 * passwords or tokens — callers must pass only safe fields.
 */
type Level = "debug" | "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  const base = { level, msg, ...(fields ?? {}) };
  if (isProd) {
    // structured line (timestamp added by the runtime/host)
    process.stdout.write(`${JSON.stringify(base)}\n`);
  } else {
    const extra = fields && Object.keys(fields).length ? ` ${JSON.stringify(fields)}` : "";
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(`[${level}] ${msg}${extra}`);
  }
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit("error", msg, fields),
};
