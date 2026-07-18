import { SpeakingRecorder } from "@/components/speaking/speaking-recorder";
import { db } from "@/db";
import { speakingTasks } from "@/db/schema";
import { SPEAKING_TASKS } from "@/lib/exam/config";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SpeakingTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [task] = await db.select().from(speakingTasks).where(eq(speakingTasks.id, id)).limit(1);
  if (!task) notFound();

  const spec = SPEAKING_TASKS.find((s) => s.taskNumber === task.taskNumber);
  return (
    <SpeakingRecorder
      taskId={task.id}
      titleFr={spec?.titleFr ?? `Tâche ${task.taskNumber}`}
      promptFr={task.promptFr}
      contextFr={task.contextFr}
      guidingPointsFr={task.guidingPointsFr}
      prepSeconds={task.prepSeconds}
      speakSeconds={task.speakSeconds}
    />
  );
}
