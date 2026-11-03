import { afterEach, describe, expect, it } from "vitest";
import { seal, unseal } from "./settings";

const original = process.env.AUTH_SECRET;
afterEach(() => {
  process.env.AUTH_SECRET = original;
});

describe("sealed settings", () => {
  it("round-trips and never stores the plaintext", () => {
    process.env.AUTH_SECRET = "a".repeat(64);
    const sealed = seal("whsec_super_secret");
    expect(sealed).not.toContain("whsec_super_secret");
    expect(unseal(sealed)).toBe("whsec_super_secret");
    expect(seal("x")).not.toBe(seal("x")); // random IV
  });

  it("returns null (→ re-provision) if AUTH_SECRET changed or data was tampered with", () => {
    process.env.AUTH_SECRET = "a".repeat(64);
    const sealed = seal("whsec_1");
    process.env.AUTH_SECRET = "b".repeat(64);
    expect(unseal(sealed)).toBeNull();
    process.env.AUTH_SECRET = "a".repeat(64);
    const parts = sealed.split(".");
    parts[3] = `${parts[3]!.slice(0, -2)}AA`;
    expect(unseal(parts.join("."))).toBeNull();
    expect(unseal("garbage")).toBeNull();
    expect(unseal(null)).toBeNull();
  });
});
