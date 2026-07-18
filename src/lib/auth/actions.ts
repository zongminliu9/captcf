"use server";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { mergeGuestIntoUser } from "./merge";
import { hashPassword, passwordIssues, verifyPassword } from "./password";
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
