import "server-only";
import { logger } from "@/lib/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}

/** Dev default: log the email (so flows work end-to-end without an email service). */
const consoleProvider: EmailProvider = {
  name: "console",
  async send(msg) {
    logger.info("email (console driver)", { to: msg.to, subject: msg.subject });
    // The body (incl. any reset link) is printed to the server console in dev only.
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n── EMAIL → ${msg.to}\n   ${msg.subject}\n   ${msg.text}\n──\n`);
    }
  },
};

/**
 * Real providers (SMTP/Resend) plug in behind this interface. They intentionally throw until
 * their env is configured, so a production deploy fails loudly rather than silently dropping mail.
 */
export function getEmailProvider(): EmailProvider {
  const driver = process.env.EMAIL_PROVIDER ?? "console";
  switch (driver) {
    case "console":
      return consoleProvider;
    case "smtp":
      if (!process.env.SMTP_URL) throw new Error("EMAIL_PROVIDER=smtp but SMTP_URL is not set");
      return smtpProvider();
    case "resend":
      if (!process.env.RESEND_API_KEY)
        throw new Error("EMAIL_PROVIDER=resend but RESEND_API_KEY is not set");
      if (!process.env.EMAIL_FROM)
        throw new Error("EMAIL_PROVIDER=resend but EMAIL_FROM is not set");
      return resendProvider(process.env.RESEND_API_KEY, process.env.EMAIL_FROM);
    default:
      return consoleProvider;
  }
}

// SMTP stays interface-only (needs nodemailer). Resend is wired over its REST API (no SDK).
function smtpProvider(): EmailProvider {
  return {
    name: "smtp",
    async send(msg) {
      throw new Error(`SMTP send not wired yet (to=${msg.to}). Add nodemailer + SMTP_URL.`);
    },
  };
}
/** Resend (https://resend.com) over plain fetch. `from` must be on a domain verified in Resend. */
function resendProvider(apiKey: string, from: string): EmailProvider {
  return {
    name: "resend",
    async send(msg) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [msg.to],
          subject: msg.subject,
          text: msg.text,
          ...(msg.html ? { html: msg.html } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Resend send failed (${res.status}): ${detail.slice(0, 200)}`);
      }
    },
  };
}
