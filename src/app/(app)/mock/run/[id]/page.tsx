import { MockRunner } from "@/components/practice/mock-runner";
import { getActor } from "@/lib/auth/session";
import { getMockState } from "@/lib/practice/mock";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MockRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect("/mock");

  const state = await getMockState(actor, id);
  if (!state) notFound();

  if (state.status === "graded") {
    if (state.attemptId) redirect(`/attempts/${state.attemptId}/results`);
    redirect("/mock");
  }

  return (
    <MockRunner
      key={state.sectionIndex}
      sessionId={state.sessionId}
      mockTitle={state.mockTitle}
      sectionIndex={state.sectionIndex}
      totalSections={state.totalSections}
      section={state.section!}
    />
  );
}
