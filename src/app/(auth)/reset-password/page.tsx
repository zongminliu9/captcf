import { ResetPasswordForm } from "@/components/auth/reset-forms";
import { Alert } from "@/components/ui/alert";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Réinitialiser le mot de passe" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <Alert tone="danger">
        Lien invalide.{" "}
        <Link href="/forgot-password" className="font-medium underline">
          Demander un nouveau lien
        </Link>
      </Alert>
    );
  }
  return <ResetPasswordForm token={token} />;
}
