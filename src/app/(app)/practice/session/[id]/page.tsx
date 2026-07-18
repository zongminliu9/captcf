import { PracticeRunner } from "@/components/practice/practice-runner";
import type { Feedback } from "@/components/practice/question-card";
import { db } from "@/db";
import { attempts, bookmarks, responses } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";
import { getClientQuestions, getFullQuestions } from "@/lib/practice/questions";
import { loadSession } from "@/lib/practice/session";
import { and, eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const MODE_TITLES: Record<string, string> = {
  quick: "Séance rapide",
  custom: "Entraînement personnalisé",
  diagnostic: "Test de diagnostic",
  review: "Révision",
  mistakes: "Mes erreurs",
  bookmarks: "Mes favoris",
  listening: "Compréhension orale",
  reading: "Compréhension écrite",
};

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect("/practice");

  const session = await loadSession(actor, id);
  if (!session) notFound();

  // finished session → jump to its results
  if (["graded", "submitted", "reviewed", "expired"].includes(session.status)) {
    const att = await db
      .select({ id: attempts.id })
      .from(attempts)
      .where(eq(attempts.sessionId, id))
      .limit(1);
    if (att[0]) redirect(`/attempts/${att[0].id}/results`);
  }

  const ids = session.itemOrder.filter((i) => i.refType === "question").map((i) => i.refId);
  const questions = await getClientQuestions(ids);
  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted">Cette séance ne contient aucune question disponible.</p>
      </div>
    );
  }

  const existing = await db.select().from(responses).where(eq(responses.sessionId, id));

  const initial: Record<string, { selected: string | null; feedback?: Feedback | null }> = {};
  const answeredIds = existing.filter((r) => r.selectedAnswer != null).map((r) => r.refId);

  if (session.instantFeedback && answeredIds.length) {
    const full = await getFullQuestions(answeredIds);
    const fullMap = new Map(full.map((f) => [f.refId, f]));
    for (const r of existing) {
      const f = r.selectedAnswer != null ? fullMap.get(r.refId) : undefined;
      initial[r.refId] = {
        selected: r.selectedAnswer,
        feedback: f
          ? {
              correct: !!r.correct,
              correctAnswer: f.correctAnswer,
              explanation: f.explanation,
              distractorRationales: f.distractorRationales,
              transcript: f.transcript,
            }
          : null,
      };
    }
  } else {
    for (const r of existing) initial[r.refId] = { selected: r.selectedAnswer };
  }

  const marks = await db
    .select({ questionId: bookmarks.questionId })
    .from(bookmarks)
    .where(and(ownerEq(bookmarks, actor), inArray(bookmarks.questionId, ids)));

  return (
    <PracticeRunner
      sessionId={id}
      questions={questions}
      initial={initial}
      instantFeedback={session.instantFeedback}
      bookmarked={marks.map((m) => m.questionId)}
      title={MODE_TITLES[session.mode] ?? "Entraînement"}
    />
  );
}
