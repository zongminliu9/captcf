import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "./url";

describe("normalizeDatabaseUrl", () => {
  it("accepts Neon's default (pooled + channel_binding) string as pasted", () => {
    const pasted =
      "postgresql://neondb_owner:p4ss@ep-cool-river-a1b2c3d4-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    const url = new URL(normalizeDatabaseUrl(pasted));
    expect(url.hostname).toBe("ep-cool-river-a1b2c3d4.us-west-2.aws.neon.tech");
    expect(url.searchParams.has("channel_binding")).toBe(false);
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.username).toBe("neondb_owner");
    expect(url.password).toBe("p4ss");
    expect(url.pathname).toBe("/neondb");
  });

  it("adds sslmode=require for Neon when missing", () => {
    const out = normalizeDatabaseUrl("postgres://u:p@ep-x.us-west-2.aws.neon.tech/db");
    expect(new URL(out).searchParams.get("sslmode")).toBe("require");
  });

  it("leaves every other URL untouched", () => {
    for (const u of [
      "postgres://captcf@localhost:5433/captcf",
      "postgres://u:p@dpg-abc.oregon-postgres.render.com/db?sslmode=require&channel_binding=require",
      "not a url",
    ]) {
      expect(normalizeDatabaseUrl(u)).toBe(u);
    }
  });
});
