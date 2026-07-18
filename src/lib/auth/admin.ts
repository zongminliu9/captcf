import "server-only";
import { redirect } from "next/navigation";
import { getActor } from "./session";
import type { Actor } from "./owner";

/** Require an authenticated admin; redirect otherwise. */
export async function requireAdmin(): Promise<Extract<Actor, { kind: "user" }>> {
  const actor = await getActor();
  if (!actor || actor.kind !== "user" || actor.role !== "admin") redirect("/dashboard");
  return actor;
}
