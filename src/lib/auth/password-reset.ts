import "server-only";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { getEmailProvider } from "@/lib/email";
import { logger } from "@/lib/logger";
import { and, eq, gt, isNull } from "drizzle-orm";
import { hashPassword, passwordIssues } from "./password";
import { hashToken, newToken } from "./tokens";

const TTL_MINUTES = 60;

/**
 * Start a password reset. Always resolves the same way (no account enumeration). If the email
 * exists, a single-use token is created and an email is sent via the configured provider (the
 * console driver prints the link in dev so the flow works with no email service).
 */
export async function requestPasswordReset(email: string, appUrl: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  if (!user) return; // silent — don't reveal whether the account exists

  const token = newToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TTL_MINUTES * 60 * 1000),
  });

  const link = `${appUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
  try {
    await getEmailProvider().send({
      to: normalized,
      subject: "Réinitialisation de votre mot de passe CapTCF",
      text: `Bonjour,\n\nPour réinitialiser votre mot de passe, ouvrez ce lien (valide ${TTL_MINUTES} minutes) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    });
  } catch (e) {
    logger.error("password reset email failed", { error: (e as Error).message });
  }
}

export interface ResetResult {
  ok: boolean;
  error?: "invalid_token" | "weak_password";
}

export async function resetPassword(token: string, newPassword: string): Promise<ResetResult> {
  if (passwordIssues(newPassword).length) return { ok: false, error: "weak_password" };

  const rows = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: "invalid_token" };

  const passwordHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, row.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, row.id));
  });
  return { ok: true };
}
