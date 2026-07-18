import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Personnaliser mon plan" };

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="display text-3xl">Personnalisons votre préparation</h1>
      <p className="mb-6 mt-2 text-muted">
        Quelques questions pour adapter vos recommandations et votre plan d'étude. Vous pourrez tout
        modifier plus tard.
      </p>
      <OnboardingForm />
    </div>
  );
}
