import { AppShell } from "@/components/app/app-shell";
import { BetaBar } from "@/components/beta/beta-bar";
import { getActor } from "@/lib/auth/session";
import { dueReviewCount, getPlanForActor } from "@/lib/entitlements/plan";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  const [plan, dueCount] = await Promise.all([getPlanForActor(actor), dueReviewCount(actor)]);

  return (
    <>
      <BetaBar />
      <AppShell
        data={{
          authed: actor?.kind === "user",
          isAdmin: actor?.kind === "user" && actor.role === "admin",
          plan,
          dueCount,
          name: actor?.kind === "user" ? actor.name : null,
          email: actor?.kind === "user" ? actor.email : null,
        }}
      >
        {children}
      </AppShell>
    </>
  );
}
