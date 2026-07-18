import { getActor } from "@/lib/auth/session";
import { SiteHeaderClient } from "./site-header-client";

export async function SiteHeader() {
  const actor = await getActor();
  return <SiteHeaderClient authed={actor?.kind === "user"} />;
}
