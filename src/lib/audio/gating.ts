/**
 * Audio provenance gating. Single source of truth for "is this clip allowed in official content?".
 *
 * Only HUMAN recordings (original or licensed) that have PASSED QA (`publishState === "approved"`)
 * may be served as official listening material to normal users or inside official published mocks.
 * TTS (`prototype_tts`) is never official — it is only for development, admin preview, and as a
 * clearly-labelled placeholder for a question whose human recording has not been produced yet.
 */
export type AudioSourceType = "human_original" | "human_licensed" | "prototype_tts";

export type AudioPublishState =
  | "draft"
  | "awaiting_recording"
  | "awaiting_edit"
  | "awaiting_qa"
  | "approved"
  | "rejected";

export const HUMAN_SOURCES: readonly AudioSourceType[] = ["human_original", "human_licensed"];

export interface AudioProvenance {
  sourceType?: string | null;
  publishState?: string | null;
}

/** True for a human recording (original or licensed). TTS returns false. */
export function isHumanAudio(a: AudioProvenance): boolean {
  const s = (a.sourceType ?? "prototype_tts") as AudioSourceType;
  return HUMAN_SOURCES.includes(s);
}

/** True only for TTS. */
export function isPrototypeAudio(a: AudioProvenance): boolean {
  return (a.sourceType ?? "prototype_tts") === "prototype_tts";
}

/**
 * Official = human recording that passed QA. This is the ONLY predicate that gates audio into
 * official published content shown to normal users.
 */
export function isOfficialAudio(a: AudioProvenance): boolean {
  return isHumanAudio(a) && a.publishState === "approved";
}

/** Short honest label for the UI so a synthetic clip is never mistaken for a human recording. */
export function audioSourceLabel(a: AudioProvenance): {
  official: boolean;
  label: string;
  synthetic: boolean;
} {
  if (isOfficialAudio(a)) {
    return { official: true, synthetic: false, label: "Enregistrement humain" };
  }
  if (isHumanAudio(a)) {
    return { official: false, synthetic: false, label: "Enregistrement humain (en révision)" };
  }
  return {
    official: false,
    synthetic: true,
    label: "Audio synthétique (prototype) — enregistrement humain à venir",
  };
}
