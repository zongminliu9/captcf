import { db } from "@/db";
import { mockTests } from "@/db/schema";
import { ensureActor } from "@/lib/auth/session";
import { can } from "@/lib/entitlements";
import { getPlanForActor } from "@/lib/entitlements/plan";
import { createMockSession } from "@/lib/practice/mock";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/** Route handler → may set the guest cookie. Gates full mocks behind Premium. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await ensureActor();

  const [mock] = await db.select().from(mockTests).where(eq(mockTests.id, id)).limit(1);
  if (!mock) return NextResponse.redirect(new URL("/mock", req.url));

  const plan = await getPlanForActor(actor);
  if (!mock.isSample && !can(plan, "full_mock_tests")) {
    return NextResponse.redirect(new URL("/pricing?reason=mock", req.url));
  }

  const sessionId = await createMockSession(actor, id);
  return NextResponse.redirect(new URL(`/mock/run/${sessionId}`, req.url));
}
