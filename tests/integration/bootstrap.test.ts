import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { bootstrap, contentChecksum } from "../../scripts/bootstrap";

const URL = process.env.DATABASE_URL ?? "postgres://captcf@localhost:5433/captcf_test";
const sql = postgres(URL, { max: 3 });

async function resetMarker() {
  await sql`CREATE TABLE IF NOT EXISTS seed_state (
    id int PRIMARY KEY DEFAULT 1, content_version text NOT NULL,
    spec_version text, applied_at timestamptz NOT NULL DEFAULT now())`;
  await sql`DELETE FROM seed_state`;
}

afterAll(async () => {
  await sql.end({ timeout: 5 }).catch(() => {});
});

describe("production bootstrap", () => {
  it("seeds once, then skips a second boot on the already-seeded DB (no full re-seed)", async () => {
    await resetMarker();

    const first = await bootstrap();
    expect(first.seeded).toBe(true);

    const [marker] = await sql<{ content_version: string }[]>`
      SELECT content_version FROM seed_state WHERE id = 1`;
    expect(marker?.content_version).toBe(contentChecksum());

    const second = await bootstrap();
    expect(second.seeded).toBe(false); // warm boot → skipped, does not walk all 600+ items
  });

  it("two concurrent boots seed at most once (advisory lock serialises them)", async () => {
    await resetMarker();

    const [a, b] = await Promise.all([bootstrap(), bootstrap()]);
    expect([a, b].filter((r) => r.seeded).length).toBe(1);

    const [marker] = await sql<{ content_version: string }[]>`
      SELECT content_version FROM seed_state WHERE id = 1`;
    expect(marker?.content_version).toBe(contentChecksum());
  });
});
