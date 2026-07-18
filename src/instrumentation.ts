/** Next.js server startup hook: validate configuration once when the server boots. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env-validation");
    validateEnv();
  }
}
