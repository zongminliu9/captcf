import { ForgotPasswordForm } from "@/components/auth/reset-forms";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
