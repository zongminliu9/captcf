"use server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { examGoals, profiles } from "@/db/schema";
import { ownerEq, ownerValues } from "@/lib/auth/owner";
import { ensureActor } from "@/lib/auth/session";

export interface OnboardingInput {
  currentLevel: string;
  targetNclc: number;
  examDate: string | null;
  weeklyDays: number;
  dailyMinutes: number;
  focusSkills: string[];
  priorAttempt: boolean;
}

export async function saveOnboarding(input: OnboardingInput): Promise<void> {
  const actor = await ensureActor();
  const ov = ownerValues(actor);
  const userTarget = actor.kind === "user";

  const existingGoal = await db.select({ id: examGoals.id }).from(examGoals).where(ownerEq(examGoals, actor)).limit(1);
  const goalValues = {
    targetNclc: Math.max(4, Math.min(10, input.targetNclc)),
    examDate: input.examDate || null,
    weeklyDays: Math.max(1, Math.min(7, input.weeklyDays)),
    dailyMinutes: Math.max(5, Math.min(120, input.dailyMinutes)),
    priorAttempt: input.priorAttempt,
    focusSkills: input.focusSkills,
    updatedAt: new Date(),
  };
  if (existingGoal[0]) {
    await db.update(examGoals).set(goalValues).where(ownerEq(examGoals, actor));
  } else {
    await db.insert(examGoals).values({ ...ov, ...goalValues });
  }

  const existingProfile = await db.select({ id: profiles.id }).from(profiles).where(ownerEq(profiles, actor)).limit(1);
  if (existingProfile[0]) {
    await db
      .update(profiles)
      .set({ currentLevel: input.currentLevel, onboardedAt: new Date(), updatedAt: new Date() })
      .where(ownerEq(profiles, actor));
  } else {
    await db.insert(profiles).values({ ...ov, currentLevel: input.currentLevel, onboardedAt: new Date() });
  }

  void userTarget;
  redirect("/dashboard");
}
