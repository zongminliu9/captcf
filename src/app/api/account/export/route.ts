import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  attempts,
  bookmarks,
  examGoals,
  masteryRecords,
  mistakes,
  practiceSessions,
  profiles,
  responses,
  reviewQueue,
  speakingSubmissions,
  writingSubmissions,
} from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";

/** GDPR-style data export: everything owned by the current actor, as JSON. */
export async function GET() {
  const actor = await getActor();
  if (!actor) return new NextResponse("Unauthorized", { status: 401 });

  const [
    profile,
    goal,
    sessions,
    attemptRows,
    responseRows,
    mastery,
    review,
    bookmarkRows,
    mistakeRows,
    writing,
    speaking,
  ] = await Promise.all([
    db.select().from(profiles).where(ownerEq(profiles, actor)),
    db.select().from(examGoals).where(ownerEq(examGoals, actor)),
    db.select().from(practiceSessions).where(ownerEq(practiceSessions, actor)),
    db.select().from(attempts).where(ownerEq(attempts, actor)),
    db.select().from(responses).where(ownerEq(responses, actor)),
    db.select().from(masteryRecords).where(ownerEq(masteryRecords, actor)),
    db.select().from(reviewQueue).where(ownerEq(reviewQueue, actor)),
    db.select().from(bookmarks).where(ownerEq(bookmarks, actor)),
    db.select().from(mistakes).where(ownerEq(mistakes, actor)),
    db.select().from(writingSubmissions).where(ownerEq(writingSubmissions, actor)),
    db.select().from(speakingSubmissions).where(ownerEq(speakingSubmissions, actor)),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: actor.kind === "user" ? { email: actor.email, name: actor.name } : { type: "guest" },
    profile,
    goal,
    sessions,
    attempts: attemptRows,
    responses: responseRows,
    mastery,
    review,
    bookmarks: bookmarkRows,
    mistakes: mistakeRows,
    writingSubmissions: writing,
    speakingSubmissions: speaking,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="captcf-donnees-${Date.now()}.json"`,
    },
  });
}
