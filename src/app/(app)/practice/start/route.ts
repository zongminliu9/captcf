import { db } from "@/db";
import { practiceSessions } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { ensureActor } from "@/lib/auth/session";
import { getPlanForActor } from "@/lib/entitlements/plan";
import { checkPracticeAllowed } from "@/lib/entitlements/usage";
import type { SkillId } from "@/lib/exam/config";
import type { SelectionConfig } from "@/lib/practice/questions";
import { type SessionMode, createSession } from "@/lib/practice/session";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Unified "start practice" entry (route handler → may set the guest cookie).
 * ?mode=quick|listening|reading|mistakes|bookmarks|review|diagnostic
 */
export async function GET(req: NextRequest) {
  const actor = await ensureActor();
  const plan = await getPlanForActor(actor);
  if (await checkPracticeAllowed(actor, plan)) {
    return NextResponse.redirect(new URL("/pricing?reason=daily_limit", req.url));
  }

  const mode = (req.nextUrl.searchParams.get("mode") ?? "quick") as SessionMode;

  const plans: Record<
    string,
    { mode: SessionMode; skill?: SkillId; selection: SelectionConfig; resumable?: boolean }
  > = {
    quick: {
      mode: "quick",
      selection: { skills: ["listening", "reading"], count: 8, source: "mixed" },
      resumable: true,
    },
    listening: {
      mode: "listening",
      skill: "listening",
      selection: { skills: ["listening"], count: 10, source: "mixed" },
      resumable: true,
    },
    reading: {
      mode: "reading",
      skill: "reading",
      selection: { skills: ["reading"], count: 10, source: "mixed" },
      resumable: true,
    },
    mistakes: {
      mode: "mistakes",
      selection: { skills: ["listening", "reading"], count: 12, source: "mistakes" },
    },
    bookmarks: {
      mode: "bookmarks",
      selection: { skills: ["listening", "reading"], count: 12, source: "bookmarks" },
    },
    review: {
      mode: "review",
      selection: { skills: ["listening", "reading"], count: 15, source: "due" },
    },
    diagnostic: {
      mode: "diagnostic",
      selection: { skills: ["listening", "reading"], count: 12, source: "mixed" },
    },
  };
  const chosen = plans[mode] ?? plans.quick!;

  if (chosen.resumable) {
    const existing = await db
      .select({ id: practiceSessions.id })
      .from(practiceSessions)
      .where(
        and(
          ownerEq(practiceSessions, actor),
          eq(practiceSessions.mode, chosen.mode),
          eq(practiceSessions.status, "in_progress"),
        ),
      )
      .orderBy(desc(practiceSessions.createdAt))
      .limit(1);
    if (existing[0])
      return NextResponse.redirect(new URL(`/practice/session/${existing[0].id}`, req.url));
  }

  let id: string;
  try {
    id = await createSession(actor, {
      mode: chosen.mode,
      skill: chosen.skill ?? null,
      instantFeedback: true,
      selection: chosen.selection,
    });
  } catch {
    // e.g. no items match the source (empty mistakes/bookmarks/due)
    const back =
      mode === "mistakes"
        ? "/mistakes"
        : mode === "bookmarks"
          ? "/bookmarks"
          : mode === "review"
            ? "/review"
            : "/practice";
    return NextResponse.redirect(new URL(`${back}?empty=1`, req.url));
  }
  return NextResponse.redirect(new URL(`/practice/session/${id}`, req.url));
}
