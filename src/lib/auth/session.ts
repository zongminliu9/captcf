import "server-only";
import { db } from "@/db";
import { authSessions, guestSessions, users } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import type { Actor } from "./owner";
import {
  GUEST_COOKIE,
  GUEST_TTL_DAYS,
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
  hashToken,
  newToken,
} from "./tokens";

const isProd = process.env.NODE_ENV === "production";

function cookieOpts(maxAgeDays: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeDays * 24 * 60 * 60,
  };
}

/** Resolve the current actor from cookies WITHOUT creating anything. */
export async function getActor(): Promise<Actor | null> {
  const jar = await cookies();

  const sessionToken = jar.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    const rows = await db
      .select({
        userId: users.id,
        role: users.role,
        email: users.email,
        name: users.name,
      })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(
        and(
          eq(authSessions.tokenHash, hashToken(sessionToken)),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (row) {
      return { kind: "user", userId: row.userId, role: row.role, email: row.email, name: row.name };
    }
  }

  const guestToken = jar.get(GUEST_COOKIE)?.value;
  if (guestToken) {
    const rows = await db
      .select({ id: guestSessions.id, mergedUserId: guestSessions.mergedUserId })
      .from(guestSessions)
      .where(eq(guestSessions.tokenHash, hashToken(guestToken)))
      .limit(1);
    const row = rows[0];
    if (row && !row.mergedUserId) return { kind: "guest", guestId: row.id };
  }

  return null;
}

/** Resolve the current actor, creating a guest session if none exists. */
export async function ensureActor(): Promise<Actor> {
  const existing = await getActor();
  if (existing) return existing;
  return createGuestSession();
}

export async function createGuestSession(): Promise<Actor> {
  const jar = await cookies();
  const token = newToken();
  const [row] = await db
    .insert(guestSessions)
    .values({ tokenHash: hashToken(token) })
    .returning({ id: guestSessions.id });
  jar.set(GUEST_COOKIE, token, cookieOpts(GUEST_TTL_DAYS));
  return { kind: "guest", guestId: row!.id };
}

export async function createUserSession(userId: string): Promise<void> {
  const jar = await cookies();
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(authSessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  jar.set(SESSION_COOKIE, token, cookieOpts(SESSION_TTL_DAYS));
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Read the guest cookie's token hash (used by the merge flow). */
export async function currentGuestId(): Promise<string | null> {
  const jar = await cookies();
  const guestToken = jar.get(GUEST_COOKIE)?.value;
  if (!guestToken) return null;
  const rows = await db
    .select({ id: guestSessions.id })
    .from(guestSessions)
    .where(eq(guestSessions.tokenHash, hashToken(guestToken)))
    .limit(1);
  return rows[0]?.id ?? null;
}
