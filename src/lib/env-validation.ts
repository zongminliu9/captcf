import { logger } from "@/lib/logger";

/**
 * Validate critical configuration at startup. In production, missing/weak values throw so a
 * misconfigured deploy fails loudly instead of running insecurely. In dev, they only warn.
 */
export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production";
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) errors.push("DATABASE_URL is not set");

  const secret = process.env.AUTH_SECRET ?? "";
  if (isProd) {
    if (secret.length < 32) errors.push("AUTH_SECRET must be at least 32 characters in production");
    if (secret.includes("dev-only") || secret.includes("change-me"))
      errors.push("AUTH_SECRET is still the placeholder value");
    if (process.env.ENABLE_DEMO_ACCOUNTS === "true")
      warnings.push("ENABLE_DEMO_ACCOUNTS=true in production (demo accounts are disabled anyway)");
  } else if (secret.length < 16) {
    warnings.push("AUTH_SECRET is short — fine for dev, generate a strong one for production");
  }

  if (process.env.PAYMENTS_PROVIDER === "stripe" && !process.env.STRIPE_SECRET_KEY)
    warnings.push("PAYMENTS_PROVIDER=stripe but STRIPE_SECRET_KEY is not set");

  for (const w of warnings) logger.warn(`env: ${w}`);
  if (errors.length) {
    const msg = `Invalid environment configuration:\n - ${errors.join("\n - ")}`;
    if (isProd) throw new Error(msg);
    logger.warn(msg);
  }
}
