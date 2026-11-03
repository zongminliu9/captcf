/**
 * Accept a Postgres connection string exactly as a host's dashboard shows it.
 *
 * Neon's "Connect" dialog defaults to a *pooled* host (`ep-…-pooler.…neon.tech`) plus
 * `channel_binding=require`. Neither suits this app as-is:
 *  - postgres.js forwards unknown URL params (like `channel_binding`) to the server as startup
 *    parameters, which Postgres rejects;
 *  - the boot step holds a session-level advisory lock, which a transaction pooler can't honour.
 * So for Neon we drop `channel_binding`, use the direct (non-pooled) host, and make sure TLS is
 * required. The app's own pool is small (≤10), well within Neon's direct-connection limit.
 * Any other URL is returned unchanged.
 */
export function normalizeDatabaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  if (!url.hostname.endsWith(".neon.tech")) return raw;

  const [first, ...rest] = url.hostname.split(".");
  if (first?.endsWith("-pooler"))
    url.hostname = [first.slice(0, -"-pooler".length), ...rest].join(".");
  url.searchParams.delete("channel_binding");
  if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
  return url.toString();
}

export function databaseUrl(fallback = "postgres://captcf@localhost:5433/captcf"): string {
  return normalizeDatabaseUrl(process.env.DATABASE_URL ?? fallback);
}
