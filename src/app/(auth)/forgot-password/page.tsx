import { ForgotPasswordForm } from "@/components/auth/reset-forms";
import { Card } from "@/components/ui/card";
import { resetEmailDelivered } from "@/lib/auth/password-reset";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Mot de passe oublié" };
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const support = process.env.SUPPORT_EMAIL ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  // In production without an email service, don't pretend a link was sent: ask the learner to
  // write in; an admin creates the link (Admin → "Lien de mot de passe").
  if (process.env.NODE_ENV === "production" && !resetEmailDelivered() && support) {
    return (
      <Card className="p-6 sm:p-8" raised>
        <h1 className="display text-2xl">Mot de passe oublié</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Écrivez-nous à{" "}
          <a
            href={`mailto:${support}?subject=${encodeURIComponent("Mot de passe oublié")}`}
            className="font-medium text-navy underline"
          >
            {support}
          </a>{" "}
          depuis l'adresse de votre compte : nous vous renvoyons un lien de réinitialisation.
        </p>
        <p className="mt-5 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-navy hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </Card>
    );
  }
  return <ForgotPasswordForm />;
}
