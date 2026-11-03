import { AuthForm } from "@/components/auth/auth-form";
import { getActor } from "@/lib/auth/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Se connecter" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const actor = await getActor();
  if (actor?.kind === "user") redirect("/dashboard");
  return <AuthForm mode="login" next={next} />;
}
