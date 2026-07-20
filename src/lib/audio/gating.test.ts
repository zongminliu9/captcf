import { describe, expect, it } from "vitest";
import { audioSourceLabel, isHumanAudio, isOfficialAudio, isPrototypeAudio } from "./gating";

describe("audio gating", () => {
  it("prototype_tts is never official — even if somehow marked approved", () => {
    expect(isOfficialAudio({ sourceType: "prototype_tts", publishState: "approved" })).toBe(false);
    expect(isPrototypeAudio({ sourceType: "prototype_tts" })).toBe(true);
    expect(isHumanAudio({ sourceType: "prototype_tts" })).toBe(false);
  });

  it("missing sourceType defaults to prototype (not official)", () => {
    expect(isOfficialAudio({})).toBe(false);
    expect(isPrototypeAudio({})).toBe(true);
  });

  it("human recording is official only once approved", () => {
    expect(isOfficialAudio({ sourceType: "human_original", publishState: "awaiting_qa" })).toBe(
      false,
    );
    expect(isOfficialAudio({ sourceType: "human_original", publishState: "approved" })).toBe(true);
    expect(isOfficialAudio({ sourceType: "human_licensed", publishState: "approved" })).toBe(true);
    expect(isOfficialAudio({ sourceType: "human_original", publishState: "rejected" })).toBe(false);
  });

  it("labels synthetic clips honestly", () => {
    expect(audioSourceLabel({ sourceType: "prototype_tts" }).synthetic).toBe(true);
    expect(
      audioSourceLabel({ sourceType: "human_original", publishState: "approved" }).official,
    ).toBe(true);
    expect(
      audioSourceLabel({ sourceType: "human_licensed", publishState: "awaiting_qa" }).synthetic,
    ).toBe(false);
  });
});
