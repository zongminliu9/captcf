import { Alert } from "@/components/ui/alert";
import { CustomPracticeForm } from "@/components/practice/custom-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entraînement personnalisé" };

export default async function CustomPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const { empty } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="display text-3xl">Entraînement personnalisé</h1>
      <p className="mb-6 mt-2 text-muted">
        Choisissez les compétences, la difficulté et la source pour composer votre séance.
      </p>
      {empty && (
        <Alert tone="warning" className="mb-4">
          Aucune question ne correspond à ces critères. Élargissez la sélection.
        </Alert>
      )}
      <CustomPracticeForm />
    </div>
  );
}
