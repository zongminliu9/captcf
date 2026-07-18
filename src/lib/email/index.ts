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
      return resendProvider();
    default:
      return consoleProvider;
  }
}

// Interface-complete adapters. Wire the actual client (nodemailer / resend) when the dependency
// and env are added; the shape callers rely on does not change.
function smtpProvider(): EmailProvider {
  return {
    name: "smtp",
    async send(msg) {
      throw new Error(`SMTP send not wired yet (to=${msg.to}). Add nodemailer + SMTP_URL.`);
    },
  };
}
function resendProvider(): EmailProvider {
  return {
    name: "resend",
    async send(msg) {
      throw new Error(
        `Resend send not wired yet (to=${msg.to}). Add the resend SDK + RESEND_API_KEY.`,
      );
    },
  };
}
