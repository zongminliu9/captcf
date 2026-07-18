import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// import.meta.dirname is undefined under some bundlers (e.g. drizzle-kit's loader);
// fall back to the process CWD, which is the project root for all our scripts.
const HERE = typeof import.meta.dirname === "string" ? import.meta.dirname : null;
const ROOT = HERE ? resolve(HERE, "../..") : process.cwd();

/**
 * Load environment variables for standalone scripts (drizzle-kit, seed, setup…).
 * Next.js loads .env on its own for the app runtime; this is only for CLI scripts.
 * Precedence (lowest → highest): .env, .env.local, existing process.env.
 */
export function loadEnv(): void {
  for (const file of [".env", ".env.local"]) {
    const path = resolve(ROOT, file);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // do not clobber an explicitly-provided process env var
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const projectRoot = ROOT;
