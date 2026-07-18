import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { WritingEditor } from "@/components/writing/writing-editor";
import { db } from "@/db";
import { writingSubmissions, writingTasks } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";
import { WRITING_TASKS } from "@/lib/exam/config";

export const dynamic = "force-dynamic";

export default async function WritingTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [task] = await db.select().from(writingTasks).where(eq(writingTasks.id, id)).limit(1);
  if (!task) notFound();

  const actor = await getActor();
  let initialText = "";
  if (actor) {
    const [draft] = await db
      .select({ text: writingSubmissions.text })
      .from(writingSubmissions)
      .where(
        and(
          ownerEq(writingSubmissions, actor),
          eq(writingSubmissions.taskId, id),
          eq(writingSubmissions.status, "draft"),
        ),
      )
      .orderBy(desc(writingSubmissions.updatedAt))
      .limit(1);
    initialText = draft?.text ?? "";
  }

  const spec = WRITING_TASKS.find((s) => s.taskNumber === task.taskNumber);

  return (
    <WritingEditor
      taskId={task.id}
      promptFr={task.promptFr}
      contextFr={task.contextFr}
      minWords={task.minWords}
      maxWords={task.maxWords}
      suggestedMinutes={task.suggestedMinutes}
      titleFr={spec?.titleFr ?? `Tâche ${task.taskNumber}`}
      initialText={initialText}
    />
  );
}
