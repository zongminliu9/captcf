import postgres from "postgres";

const URL = process.env.E2E_DATABASE_URL ?? "postgres://captcf@localhost:5433/captcf_test";

/** Backdate every section of the most recent in-progress mock session so it auto-submits. */
export async function expireLatestMock(): Promise<void> {
  const sql = postgres(URL, { max: 1 });
  try {
    const rows = await sql`
      SELECT id, config FROM practice_sessions
      WHERE mode = 'mock' AND status = 'in_progress'
      ORDER BY created_at DESC LIMIT 1`;
    if (!rows[0]) return;
    const config = rows[0].config as any;
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    config.sections = config.sections.map((s: any) => ({ ...s, startedAt: past }));
    await sql`UPDATE practice_sessions SET config = ${sql.json(config)} WHERE id = ${rows[0].id}`;
  } finally {
    await sql.end();
  }
}
