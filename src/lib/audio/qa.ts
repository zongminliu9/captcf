/**
 * Audio technical QA + publish-eligibility rules.
 *
 * Pure functions (no DB, no fs) so every rule is unit-testable. The DB/admin layer calls these;
 * it must never re-implement or bypass them.
 *
 * Technical analysis runs on the **WAV master** (parsable in pure Node). Compressed deliveries
 * (m4a/opus) are containers we cannot decode without ffmpeg, so a delivery-only upload can be
 * stored and auditioned but CANNOT pass technical QA — the master is required. That is deliberate:
 * we would rather block publication than fake a measurement.
 */
import { createHash } from "node:crypto";
import { type AudioProvenance, isHumanAudio, isOfficialAudio } from "./gating";

export interface AudioMetrics {
  /** true when these numbers came from a real decoded WAV master. */
  analysed: boolean;
  durationMs: number;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  /** Estimated integrated loudness. RMS-based approximation, NOT exact ITU-R BS.1770. */
  loudnessLufs: number;
  truePeakDb: number;
  leadingSilenceMs: number;
  trailingSilenceMs: number;
  clipped: boolean;
  /** longest internal silence, catches dead air / truncation */
  maxGapMs: number;
}

/** Delivery/QA thresholds — see docs/AUDIO_RECORDING_GUIDE.md. */
export const TECH = {
  minSampleRate: 44_100,
  minBitDepth: 16,
  loudnessTargetLufs: -16,
  loudnessToleranceDb: 3,
  maxTruePeakDb: -1,
  minDurationMs: 1_500,
  maxLeadingSilenceMs: 1_500,
  maxTrailingSilenceMs: 2_000,
  maxGapMs: 4_000,
} as const;

export interface QaResult {
  pass: boolean;
  failures: string[];
  warnings: string[];
}

/** Technical gate. A non-analysed (delivery-only) file can never pass. */
export function technicalQa(m: AudioMetrics): QaResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (!m.analysed) {
    failures.push("no_master_analysis: upload the WAV master for technical QA");
    return { pass: false, failures, warnings };
  }
  if (m.durationMs <= 0) failures.push("empty_or_corrupt_audio");
  if (m.durationMs > 0 && m.durationMs < TECH.minDurationMs)
    failures.push(`too_short: ${m.durationMs}ms < ${TECH.minDurationMs}ms`);
  if (m.sampleRate < TECH.minSampleRate)
    failures.push(`sample_rate_too_low: ${m.sampleRate} < ${TECH.minSampleRate}`);
  if (m.bitDepth < TECH.minBitDepth)
    failures.push(`bit_depth_too_low: ${m.bitDepth} < ${TECH.minBitDepth}`);
  if (m.clipped) failures.push("clipping_detected");
  if (m.truePeakDb > TECH.maxTruePeakDb)
    failures.push(`true_peak_too_high: ${m.truePeakDb.toFixed(2)} dBTP > ${TECH.maxTruePeakDb}`);
  const loudnessOff = Math.abs(m.loudnessLufs - TECH.loudnessTargetLufs);
  if (loudnessOff > TECH.loudnessToleranceDb)
    failures.push(
      `loudness_out_of_range: ${m.loudnessLufs.toFixed(1)} LUFS (target ${TECH.loudnessTargetLufs} ±${TECH.loudnessToleranceDb})`,
    );
  if (m.leadingSilenceMs > TECH.maxLeadingSilenceMs)
    warnings.push(`long_leading_silence: ${m.leadingSilenceMs}ms`);
  if (m.trailingSilenceMs > TECH.maxTrailingSilenceMs)
    warnings.push(`long_trailing_silence: ${m.trailingSilenceMs}ms`);
  if (m.leadingSilenceMs < 50 || m.trailingSilenceMs < 50)
    warnings.push("possible_truncation: <50ms head/tail silence");
  if (m.maxGapMs > TECH.maxGapMs) failures.push(`dead_air: ${m.maxGapMs}ms internal silence`);

  return { pass: failures.length === 0, failures, warnings };
}

/** Stable hash of a transcript, whitespace/case-normalised so trivial formatting isn't a mismatch. */
export function transcriptHash(text: string): string {
  const norm = text.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256").update(norm).digest("hex");
}

export interface ApprovalInput {
  provenance: AudioProvenance;
  /** licence metadata — required when sourceType is human_licensed */
  licenseName?: string | null;
  licenseUrl?: string | null;
  /** hash of the transcript the recording was made from */
  recordedTranscriptHash?: string | null;
  /** hash of the question's current transcript */
  expectedTranscriptHash?: string | null;
  metrics: AudioMetrics;
  /** a human actually listened and confirmed */
  humanListenConfirmed?: boolean;
}

/**
 * Can this clip be APPROVED (and therefore published as official listening material)?
 * Every rule must hold — existence of a file is never sufficient.
 */
export function canApprove(input: ApprovalInput): QaResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (!isHumanAudio(input.provenance)) {
    failures.push("not_human_audio: synthetic (TTS) clips can never be approved as official");
  }
  if (input.provenance.sourceType === "human_licensed") {
    if (!input.licenseName?.trim()) failures.push("missing_license_name");
    if (!input.licenseUrl?.trim()) failures.push("missing_license_url");
  }
  if (!input.recordedTranscriptHash || !input.expectedTranscriptHash) {
    failures.push("missing_transcript_hash");
  } else if (input.recordedTranscriptHash !== input.expectedTranscriptHash) {
    failures.push("transcript_mismatch: recording does not match the question transcript");
  }
  const tech = technicalQa(input.metrics);
  failures.push(...tech.failures);
  warnings.push(...tech.warnings);
  if (!input.humanListenConfirmed) failures.push("human_listen_not_confirmed");

  return { pass: failures.length === 0, failures, warnings };
}

/** Final gate used by the mock assembler: may this clip serve official published content? */
export function canServeOfficial(p: AudioProvenance): boolean {
  return isOfficialAudio(p);
}

// ── WAV master analysis (pure Node, no ffmpeg) ───────────────────────────────

const SILENCE_FLOOR = 0.005; // amplitude below this counts as silence

/**
 * Parse a PCM WAV master and measure it. Returns `analysed:false` for anything we cannot decode
 * (compressed containers, malformed/0-byte files) rather than guessing.
 */
export function analyseWav(buf: Buffer): AudioMetrics {
  const unknown: AudioMetrics = {
    analysed: false,
    durationMs: 0,
    sampleRate: 0,
    bitDepth: 0,
    channels: 0,
    loudnessLufs: Number.NEGATIVE_INFINITY,
    truePeakDb: Number.NEGATIVE_INFINITY,
    leadingSilenceMs: 0,
    trailingSilenceMs: 0,
    clipped: false,
    maxGapMs: 0,
  };
  if (buf.length < 44) return unknown;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE")
    return unknown;

  // walk chunks to find fmt + data (a WAV may carry LIST/INFO chunks first)
  let pos = 12;
  let sampleRate = 0;
  let bitDepth = 0;
  let channels = 0;
  let format = 1;
  let dataStart = -1;
  let dataLen = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === "fmt ") {
      format = buf.readUInt16LE(body);
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bitDepth = buf.readUInt16LE(body + 14);
    } else if (id === "data") {
      dataStart = body;
      dataLen = Math.min(size, buf.length - body);
    }
    pos = body + size + (size % 2); // chunks are word-aligned
    if (dataStart >= 0 && sampleRate) break;
  }
  if (dataStart < 0 || !sampleRate || !channels || dataLen <= 0) return unknown;
  // PCM (1) and float (3) only; anything else we refuse to guess at
  if (format !== 1 && format !== 3) return unknown;

  const bytesPerSample = bitDepth / 8;
  const frameCount = Math.floor(dataLen / (bytesPerSample * channels));
  if (frameCount <= 0) return unknown;

  const readSample = (i: number): number => {
    const off = dataStart + i * bytesPerSample * channels; // channel 0 only (mono analysis)
    if (off + bytesPerSample > buf.length) return 0;
    if (format === 3 && bitDepth === 32) return buf.readFloatLE(off);
    if (bitDepth === 16) return buf.readInt16LE(off) / 32768;
    if (bitDepth === 24) {
      const v = buf.readUIntLE(off, 3);
      return ((v & 0x800000 ? v - 0x1000000 : v) as number) / 8388608;
    }
    if (bitDepth === 32) return buf.readInt32LE(off) / 2147483648;
    if (bitDepth === 8) return (buf.readUInt8(off) - 128) / 128;
    return 0;
  };

  let peak = 0;
  let sumSq = 0;
  let clipped = false;
  let firstLoud = -1;
  let lastLoud = -1;
  let gap = 0;
  let maxGap = 0;

  for (let i = 0; i < frameCount; i++) {
    const s = readSample(i);
    const a = Math.abs(s);
    if (a > peak) peak = a;
    if (a >= 0.999) clipped = true;
    sumSq += s * s;
    if (a > SILENCE_FLOOR) {
      if (firstLoud < 0) firstLoud = i;
      lastLoud = i;
      if (gap > maxGap) maxGap = gap;
      gap = 0;
    } else if (firstLoud >= 0) {
      gap++;
    }
  }

  const ms = (frames: number) => Math.round((frames / sampleRate) * 1000);
  const rms = Math.sqrt(sumSq / frameCount);
  // Approximation: RMS dBFS shifted to align a typical speech RMS with its LUFS reading.
  const loudnessLufs = rms > 0 ? 20 * Math.log10(rms) - 0.7 : Number.NEGATIVE_INFINITY;
  const truePeakDb = peak > 0 ? 20 * Math.log10(peak) : Number.NEGATIVE_INFINITY;

  return {
    analysed: true,
    durationMs: ms(frameCount),
    sampleRate,
    bitDepth,
    channels,
    loudnessLufs,
    truePeakDb,
    leadingSilenceMs: firstLoud < 0 ? ms(frameCount) : ms(firstLoud),
    trailingSilenceMs: lastLoud < 0 ? ms(frameCount) : ms(frameCount - 1 - lastLoud),
    clipped,
    maxGapMs: ms(maxGap),
  };
}

/** Peak-normalise helper for the admin "fix loudness" action (returns gain, does not mutate). */
export function suggestedGainDb(m: AudioMetrics): number {
  if (!m.analysed || m.loudnessLufs === Number.NEGATIVE_INFINITY) return 0;
  const wanted = TECH.loudnessTargetLufs - m.loudnessLufs;
  const headroom = TECH.maxTruePeakDb - m.truePeakDb;
  return Math.min(wanted, headroom);
}
