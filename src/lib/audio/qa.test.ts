import { describe, expect, it } from "vitest";
import { planImport, questionIdFromFilename } from "./import";
import {
  type AudioMetrics,
  analyseWav,
  canApprove,
  canServeOfficial,
  technicalQa,
  transcriptHash,
} from "./qa";

/** Build a synthetic PCM WAV so the analyser is tested on real bytes, not mocks. */
function makeWav(opts: {
  seconds?: number;
  sampleRate?: number;
  bitDepth?: 16 | 24;
  amplitude?: number;
  leadSilenceSec?: number;
  tailSilenceSec?: number;
}): Buffer {
  const sampleRate = opts.sampleRate ?? 48000;
  const bitDepth = opts.bitDepth ?? 24;
  const seconds = opts.seconds ?? 4;
  const amp = opts.amplitude ?? 0.16;
  const lead = Math.floor((opts.leadSilenceSec ?? 0.2) * sampleRate);
  const tail = Math.floor((opts.tailSilenceSec ?? 0.2) * sampleRate);
  const total = Math.floor(seconds * sampleRate);
  const bytesPer = bitDepth / 8;
  const data = Buffer.alloc(total * bytesPer);

  for (let i = 0; i < total; i++) {
    let v = 0;
    if (i >= lead && i < total - tail) {
      // speech-ish: tone with light amplitude variation so RMS is stable
      v = Math.sin((2 * Math.PI * 140 * i) / sampleRate) * amp;
    }
    if (bitDepth === 16) data.writeInt16LE(Math.max(-32768, Math.min(32767, v * 32768)), i * 2);
    else {
      const s = Math.max(-8388608, Math.min(8388607, Math.round(v * 8388608)));
      data.writeUIntLE(s < 0 ? s + 0x1000000 : s, i * 3, 3);
    }
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * bytesPer, 28);
  header.writeUInt16LE(bytesPer, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function goodMetrics(over: Partial<AudioMetrics> = {}): AudioMetrics {
  return {
    analysed: true,
    durationMs: 6000,
    sampleRate: 48000,
    bitDepth: 24,
    channels: 1,
    loudnessLufs: -16,
    truePeakDb: -3,
    leadingSilenceMs: 250,
    trailingSilenceMs: 300,
    clipped: false,
    maxGapMs: 500,
    ...over,
  };
}

const TRANSCRIPT = "Sophie : Bonjour, l'autobus numéro 12 passe à quelle heure ?";

function approvalBase() {
  const h = transcriptHash(TRANSCRIPT);
  return {
    provenance: { sourceType: "human_original", publishState: "awaiting_qa" },
    recordedTranscriptHash: h,
    expectedTranscriptHash: h,
    metrics: goodMetrics(),
    humanListenConfirmed: true,
  };
}

describe("WAV master analysis", () => {
  it("measures a real PCM WAV (duration, rate, depth, silence)", () => {
    const m = analyseWav(makeWav({ seconds: 4, leadSilenceSec: 0.2, tailSilenceSec: 0.3 }));
    expect(m.analysed).toBe(true);
    expect(m.sampleRate).toBe(48000);
    expect(m.bitDepth).toBe(24);
    expect(m.channels).toBe(1);
    expect(m.durationMs).toBeGreaterThan(3900);
    expect(m.durationMs).toBeLessThan(4100);
    expect(m.leadingSilenceMs).toBeGreaterThan(150);
    expect(m.trailingSilenceMs).toBeGreaterThan(250);
    expect(m.clipped).toBe(false);
  });

  it("flags clipping and refuses to analyse non-WAV / empty buffers", () => {
    expect(analyseWav(makeWav({ amplitude: 1.0 })).clipped).toBe(true);
    expect(analyseWav(Buffer.alloc(0)).analysed).toBe(false);
    expect(analyseWav(Buffer.from("not audio at all")).analysed).toBe(false);
  });
});

describe("technical QA", () => {
  it("passes a clean master", () => {
    expect(technicalQa(goodMetrics()).pass).toBe(true);
  });

  it("a delivery-only upload (no analysed master) cannot pass", () => {
    const r = technicalQa(goodMetrics({ analysed: false }));
    expect(r.pass).toBe(false);
    expect(r.failures[0]).toContain("no_master_analysis");
  });

  it("rejects low sample rate, clipping, hot peak, wrong loudness, dead air", () => {
    expect(technicalQa(goodMetrics({ sampleRate: 22050 })).pass).toBe(false);
    expect(technicalQa(goodMetrics({ clipped: true })).pass).toBe(false);
    expect(technicalQa(goodMetrics({ truePeakDb: -0.2 })).pass).toBe(false);
    expect(technicalQa(goodMetrics({ loudnessLufs: -30 })).pass).toBe(false);
    expect(technicalQa(goodMetrics({ maxGapMs: 9000 })).pass).toBe(false);
  });
});

describe("approval rules", () => {
  it("approves a clean human original", () => {
    expect(canApprove(approvalBase()).pass).toBe(true);
  });

  it("REQUIRED: prototype_tts can never be approved", () => {
    const r = canApprove({
      ...approvalBase(),
      provenance: { sourceType: "prototype_tts", publishState: "awaiting_qa" },
    });
    expect(r.pass).toBe(false);
    expect(r.failures.some((f) => f.startsWith("not_human_audio"))).toBe(true);
  });

  it("REQUIRED: human_licensed without licence name/url cannot be approved", () => {
    const r = canApprove({
      ...approvalBase(),
      provenance: { sourceType: "human_licensed", publishState: "awaiting_qa" },
    });
    expect(r.pass).toBe(false);
    expect(r.failures).toContain("missing_license_name");
    expect(r.failures).toContain("missing_license_url");

    const ok = canApprove({
      ...approvalBase(),
      provenance: { sourceType: "human_licensed", publishState: "awaiting_qa" },
      licenseName: "Studio X commercial licence",
      licenseUrl: "https://example.com/licence/123",
    });
    expect(ok.pass).toBe(true);
  });

  it("REQUIRED: transcript hash mismatch blocks approval", () => {
    const r = canApprove({
      ...approvalBase(),
      recordedTranscriptHash: transcriptHash("un texte complètement différent"),
    });
    expect(r.pass).toBe(false);
    expect(r.failures.some((f) => f.startsWith("transcript_mismatch"))).toBe(true);
  });

  it("transcript hash ignores whitespace/case noise but not real edits", () => {
    expect(transcriptHash("Bonjour  le   MONDE ")).toBe(transcriptHash("bonjour le monde"));
    expect(transcriptHash("bonjour le monde")).not.toBe(transcriptHash("bonsoir le monde"));
  });

  it("REQUIRED: technical failure blocks approval", () => {
    const r = canApprove({ ...approvalBase(), metrics: goodMetrics({ clipped: true }) });
    expect(r.pass).toBe(false);
    expect(r.failures).toContain("clipping_detected");
  });

  it("requires a confirmed human listen (file existence is never enough)", () => {
    const r = canApprove({ ...approvalBase(), humanListenConfirmed: false });
    expect(r.pass).toBe(false);
    expect(r.failures).toContain("human_listen_not_confirmed");
  });

  it("REQUIRED: only approved human audio may serve official content", () => {
    expect(canServeOfficial({ sourceType: "human_original", publishState: "approved" })).toBe(true);
    expect(canServeOfficial({ sourceType: "human_original", publishState: "awaiting_qa" })).toBe(
      false,
    );
    expect(canServeOfficial({ sourceType: "prototype_tts", publishState: "approved" })).toBe(false);
  });
});

describe("batch import planning", () => {
  const ctx = {
    knownQuestionIds: new Set(["listening_a1_0001", "listening_b2_0007"]),
    existingVersions: new Map([["listening_b2_0007", 2]]),
  };

  it("matches by stable filename and versions without overwriting", () => {
    const plan = planImport(
      [
        { filename: "listening_a1_0001.wav", bytes: 900_000 },
        { filename: "listening_b2_0007.wav", bytes: 800_000 },
      ],
      ctx,
    );
    expect(plan.matched).toBe(2);
    expect(plan.items[0]!.nextVersion).toBe(1);
    expect(plan.items[1]!.nextVersion).toBe(3); // existing v2 → new v3, never in place
  });

  it("REQUIRED: bad files are quarantined, good ones still import (no dirty records)", () => {
    const plan = planImport(
      [
        { filename: "listening_a1_0001.wav", bytes: 900_000 }, // good
        { filename: "notes.txt", bytes: 10 }, // unsupported
        { filename: "listening_z9_9999.wav", bytes: 500 }, // unknown question
        { filename: "listening_a1_0001.wav", bytes: 900_000 }, // duplicate in batch
        { filename: "empty.wav", bytes: 0 }, // 0-byte
      ],
      ctx,
    );
    expect(plan.matched).toBe(1);
    expect(plan.unsupported).toBe(2); // notes.txt + 0-byte
    expect(plan.unmatched).toBe(1);
    expect(plan.duplicates).toBe(1);
    // every non-matched item carries a reason and no version → nothing can be written for it
    for (const i of plan.items.filter((x) => x.outcome !== "matched")) {
      expect(i.nextVersion).toBeNull();
      expect(i.reason).toBeTruthy();
    }
  });

  it("parses ids from tolerant filenames", () => {
    expect(questionIdFromFilename("listening_b2_0007.wav")).toBe("listening_b2_0007");
    expect(questionIdFromFilename("listening_b2_0007 (1).m4a")).toBe("listening_b2_0007");
    expect(questionIdFromFilename("listening_b2_0007-v2.wav")).toBe("listening_b2_0007");
    expect(questionIdFromFilename("random.wav")).toBeNull();
  });
});
