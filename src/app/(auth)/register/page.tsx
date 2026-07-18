import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getActor } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage() {
  const actor = await getActor();
  if (actor?.kind === "user") redirect("/dashboard");
  return <AuthForm mode="register" />;
}
