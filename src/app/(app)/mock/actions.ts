"use server";
import { ensureActor } from "@/lib/auth/session";
import { advanceMockSection, startMockSection } from "@/lib/practice/mock";
import { recordResponse } from "@/lib/practice/session";

export async function startMockSectionAction(sessionId: string): Promise<void> {
  const actor = await ensureActor();
  await startMockSection(actor, sessionId);
}

export async function answerMock(
  sessionId: string,
  input: { refId: string; selectedAnswer: string | null; responseMs?: number },
): Promise<{ ok: true }> {
  const actor = await ensureActor();
  await recordResponse(actor, sessionId, input);
  return { ok: true };
}

export async function advanceMock(
  sessionId: string,
): Promise<{ done: boolean; attemptId?: string }> {
  const actor = await ensureActor();
  return advanceMockSection(actor, sessionId);
}
