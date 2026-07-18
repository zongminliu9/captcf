import { db } from "@/db";
import {
  attempts,
  bookmarks,
  guestSessions,
  masteryRecords,
  mistakes,
  questions,
  responses,
  reviewQueue,
  subscriptions,
  users,
} from "@/db/schema";
import { mergeGuestIntoUser } from "@/lib/auth/merge";
import type { Actor } from "@/lib/auth/owner";
import { getPlanForActor } from "@/lib/entitlements/plan";
import { createSession, recordResponse, submitSession } from "@/lib/practice/session";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const created: { userIds: string[]; guestIds: string[] } = { userIds: [], guestIds: [] };

async function newGuest(): Promise<Actor & { kind: "guest" }> {
  const [g] = await db
    .insert(guestSessions)
    .values({ tokenHash: `test_${Math.random().toString(36).slice(2)}` })
    .returning({ id: guestSessions.id });
  created.guestIds.push(g!.id);
  return { kind: "guest", guestId: g!.id };
}

async function newUser(): Promise<Actor & { kind: "user" }> {
  const [u] = await db
    .insert(users)
    .values({ email: `it_${Math.random().toString(36).slice(2)}@captcf.test`, passwordHash: "x" })
    .returning({ id: users.id });
  created.userIds.push(u!.id);
  return { kind: "user", userId: u!.id, role: "user", email: "it@test", name: null };
}

async function pickQuestions(skill: "listening" | "reading", n: number) {
  return db.select().from(questions).where(eq(questions.skill, skill)).limit(n);
}

beforeAll(async () => {
  const count = await db.select({ id: questions.id }).from(questions).limit(1);
  expect(count.length).toBe(1); // DB is seeded
});

afterAll(async () => {
  for (const id of created.userIds) {
    // owner tables have no FK cascade for user_id → clean manually
    for (const t of [responses, attempts, masteryRecords, mistakes, reviewQueue, bookmarks]) {
      await db.delete(t).where(eq((t as any).userId, id));
    }
    await db.delete(subscriptions).where(eq(subscriptions.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }
  for (const id of created.guestIds) await db.delete(guestSessions).where(eq(guestSessions.id, id));
});

describe("practice session lifecycle", () => {
  it("creates, records, grades, and updates mastery + mistakes + review", async () => {
    const actor = await newGuest();
    const qs = await pickQuestions("reading", 3);
    const sessionId = await createSession(actor, {
      mode: "custom",
      itemRefs: qs.map((q) => ({ refType: "question", refId: q.id })),
      instantFeedback: true,
    });

    // answer: first correct, rest deliberately wrong
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i]!;
      const wrongOption = ["a", "b", "c", "d"].find((o) => o !== q.correctAnswer)!;
      const answer = i === 0 ? q.correctAnswer : wrongOption;
      const res = await recordResponse(actor, sessionId, { refId: q.id, selectedAnswer: answer });
      expect(res.saved).toBe(true);
      expect(res.feedback?.correct).toBe(i === 0);
    }

    const summary = await submitSession(actor, sessionId);
    expect(summary.totalItems).toBe(3);
    expect(summary.correctItems).toBe(1);
    expect(summary.perSkill.reading?.answered).toBe(3);

    // mastery recorded for reading
    const mastery = await db
      .select()
      .from(masteryRecords)
      .where(and(eq(masteryRecords.guestId, actor.guestId), eq(masteryRecords.skill, "reading")));
    expect(mastery.length).toBeGreaterThan(0);

    // the two wrong answers became mistakes + review items
    const wrongCount = await db
      .select()
      .from(mistakes)
      .where(eq(mistakes.guestId, actor.kind === "guest" ? actor.guestId : ""));
    expect(wrongCount.length).toBe(2);
    const review = await db
      .select()
      .from(reviewQueue)
      .where(eq(reviewQueue.guestId, actor.guestId));
    expect(review.length).toBe(2);
  });

  it("is idempotent on re-submit (no double attempt)", async () => {
    const actor = await newGuest();
    const qs = await pickQuestions("listening", 2);
    const sessionId = await createSession(actor, {
      mode: "custom",
      itemRefs: qs.map((q) => ({ refType: "question", refId: q.id })),
    });
    for (const q of qs)
      await recordResponse(actor, sessionId, { refId: q.id, selectedAnswer: q.correctAnswer });
    const a1 = await submitSession(actor, sessionId);
    const a2 = await submitSession(actor, sessionId);
    expect(a1.attemptId).toBe(a2.attemptId);
    const rows = await db.select().from(attempts).where(eq(attempts.sessionId, sessionId));
    expect(rows.length).toBe(1);
  });
});

describe("guest → account merge", () => {
  it("moves guest data to the user and is idempotent", async () => {
    const guest = await newGuest();
    const user = await newUser();

    // give the guest some data
    const qs = await pickQuestions("reading", 2);
    const sessionId = await createSession(guest, {
      mode: "custom",
      itemRefs: qs.map((q) => ({ refType: "question", refId: q.id })),
    });
    for (const q of qs) {
      const wrong = ["a", "b", "c", "d"].find((o) => o !== q.correctAnswer)!;
      await recordResponse(guest, sessionId, { refId: q.id, selectedAnswer: wrong });
    }
    await submitSession(guest, sessionId);
    await db.insert(bookmarks).values({ guestId: guest.guestId, questionId: qs[0]!.id });

    // merge twice
    await mergeGuestIntoUser(guest.guestId, user.userId);
    await mergeGuestIntoUser(guest.guestId, user.userId);

    // attempts now belong to the user (exactly one, no duplication)
    const userAttempts = await db.select().from(attempts).where(eq(attempts.userId, user.userId));
    expect(userAttempts.length).toBe(1);
    // mistakes + bookmarks moved, still single copies
    const userMistakes = await db.select().from(mistakes).where(eq(mistakes.userId, user.userId));
    expect(userMistakes.length).toBe(2);
    const userBookmarks = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, user.userId));
    expect(userBookmarks.length).toBe(1);
    // guest no longer owns anything
    const leftover = await db.select().from(attempts).where(eq(attempts.guestId, guest.guestId));
    expect(leftover.length).toBe(0);
  });
});

describe("entitlements", () => {
  it("resolves free by default and premium with an active subscription", async () => {
    const user = await newUser();
    expect(await getPlanForActor(user)).toBe("free");
    await db
      .insert(subscriptions)
      .values({ userId: user.userId, plan: "premium", status: "active", provider: "simulator" })
      .onConflictDoUpdate({ target: subscriptions.userId, set: { plan: "premium" } });
    expect(await getPlanForActor(user)).toBe("premium");
    expect(await getPlanForActor({ kind: "guest", guestId: "x" })).toBe("free");
  });
});
