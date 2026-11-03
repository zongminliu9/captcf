import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function readSetting<T>(key: string, tx: Tx | typeof db = db): Promise<T | null> {
  const rows = await tx
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return (rows[0]?.value as T | undefined) ?? null;
}

export async function writeSetting(key: string, value: unknown, tx: Tx | typeof db = db) {
  await tx
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}

// ── secrets at rest ──────────────────────────────────────────────────────────
// Secrets the app obtains itself (e.g. the Stripe webhook signing secret) are stored AES-256-GCM
// encrypted with a key derived from AUTH_SECRET. If AUTH_SECRET ever changes, unseal() returns
// null and the app simply provisions a fresh secret.

function key(): Buffer {
  return createHash("sha256")
    .update(`captcf-settings|${process.env.AUTH_SECRET ?? ""}`)
    .digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), ct]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

export function unseal(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const [v, iv, tag, ct] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !ct) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
