import { createHash, randomBytes } from "node:crypto";

/** Opaque, high-entropy session token (stored in the cookie). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only the hash is stored in the DB, so a DB leak can't be replayed as a cookie. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const SESSION_COOKIE = "captcf_session";
export const GUEST_COOKIE = "captcf_guest";
export const SESSION_TTL_DAYS = 30;
export const GUEST_TTL_DAYS = 60;
