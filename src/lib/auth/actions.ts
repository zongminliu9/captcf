"use server";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { mergeGuestIntoUser } from "./merge";
import { hashPassword, passwordIssues, verifyPassword } from "./password";
import { requestPasswordReset, resetPassword } from "./password-reset";
import { createUserSession, currentGuestId, signOut } from "./session";

export interface AuthState {
  error?: string;
  fieldErrors?: { email?: string; password?: string; name?: string };
}

const emailSchema = z.string().email().max(200);

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;

  const emailParsed = emailSchema.safeParse(email);
  if (!emailParsed.success) return { fieldErrors: { email: "Adresse courriel invalide." } };
  const pwIssues = passwordIssues(password);
  if (pwIssues.length) {
    return {
      fieldErrors: {
        password:
          "Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre.",
      },
    };
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing[0]) return { fieldErrors: { email: "Cette adresse est déjà utilisée." } };

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, name })
    .returning({ id: users.id });

  await db
    .insert(subscriptions)
    .values({ userId: user!.id, plan: "free", status: "active" })
    .onConflictDoNothing();

  // preserve guest progress
  const guestId = await currentGuestId();
  if (guestId) await mergeGuestIntoUser(guestId, user!.id);

  await createUserSession(user!.id);
  redirect("/dashboard");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Renseignez votre courriel et votre mot de passe." };

  const rl = await rateLimit(clientKey(await headers(), "login"), 10, 60);
  if (!rl.allowed) return { error: "Trop de tentatives. Réessayez dans une minute." };

  const rows = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Courriel ou mot de passe incorrect." };
  }

  const guestId = await currentGuestId();
  if (guestId) await mergeGuestIntoUser(guestId, user.id);

  await createUserSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/");
}

export interface ResetState {
  sent?: boolean;
  done?: boolean;
  error?: string;
}

export async function requestResetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!emailSchema.safeParse(email).success) return { error: "Adresse courriel invalide." };
  const rl = await rateLimit(clientKey(await headers(), "reset"), 5, 3600);
  if (!rl.allowed) return { error: "Trop de demandes. Réessayez plus tard." };
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  await requestPasswordReset(email, appUrl);
  // always report success (no account enumeration)
  return { sent: true };
}

export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const res = await resetPassword(token, password);
  if (!res.ok) {
    return {
      error:
        res.error === "weak_password"
          ? "Mot de passe trop faible (8+ caractères, une lettre, un chiffre)."
          : "Lien invalide ou expiré. Demandez-en un nouveau.",
    };
  }
  return { done: true };
}
