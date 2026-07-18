import { type SQL, and, eq, isNull } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/** The current subject of a request: a signed-in user or an anonymous guest. */
export type Actor =
  | { kind: "user"; userId: string; role: "user" | "admin"; email: string; name: string | null }
  | { kind: "guest"; guestId: string };

export function isUser(actor: Actor | null): actor is Extract<Actor, { kind: "user" }> {
  return actor?.kind === "user";
}

/** Column values to write when inserting an owned row. */
export function ownerValues(actor: Actor): { userId: string | null; guestId: string | null } {
  return actor.kind === "user"
    ? { userId: actor.userId, guestId: null }
    : { userId: null, guestId: actor.guestId };
}

/** WHERE clause matching rows owned by this actor (and only this actor). */
export function ownerEq(cols: { userId: AnyPgColumn; guestId: AnyPgColumn }, actor: Actor): SQL {
  return actor.kind === "user"
    ? (and(eq(cols.userId, actor.userId), isNull(cols.guestId)) as SQL)
    : (and(eq(cols.guestId, actor.guestId), isNull(cols.userId)) as SQL);
}
