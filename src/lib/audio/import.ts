/**
 * Batch recording import planning — pure, so matching/quarantine/versioning is unit-testable.
 *
 * The admin uploads a folder of recordings. We match each file to a question by its stable id
 * (the filename stem, e.g. `listening_b2_0007.wav`). Nothing is written until the whole plan is
 * computed, and each file is committed independently: one bad file can never leave a half-written
 * record behind (see `applyPlan` in the admin action).
 */
export type ImportOutcome = "matched" | "unmatched" | "duplicate_version" | "unsupported_format";

export interface ImportFile {
  filename: string;
  bytes: number;
}

export interface PlannedImport {
  filename: string;
  questionId: string | null;
  outcome: ImportOutcome;
  /** version this upload would create for that question (existing + 1) */
  nextVersion: number | null;
  reason?: string;
}

export interface ImportPlan {
  items: PlannedImport[];
  matched: number;
  unmatched: number;
  duplicates: number;
  unsupported: number;
}

const MASTER_EXT = new Set(["wav"]);
const DELIVERY_EXT = new Set(["m4a", "mp4", "aac", "opus", "ogg", "webm"]);

export function extensionOf(filename: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return m ? m[1]!.toLowerCase() : "";
}

/** `listening_b2_0007.wav` → `listening_b2_0007`; tolerates a `-v2` / ` (1)` suffix. */
export function questionIdFromFilename(filename: string): string | null {
  const base = filename
    .trim()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\s*\(\d+\)$/, "")
    .replace(/[-_]v\d+$/i, "");
  return /^[a-z]+_[a-z0-9]+_\d{4}$/.test(base) ? base : null;
}

export function isMaster(filename: string): boolean {
  return MASTER_EXT.has(extensionOf(filename));
}

export interface PlanContext {
  /** ids that exist and are awaiting/accepting a recording */
  knownQuestionIds: Set<string>;
  /** current stored version per question id (0 / absent when none yet) */
  existingVersions: Map<string, number>;
  /** ids whose current version is already approved — re-upload creates a NEW version, never overwrites */
  approvedIds?: Set<string>;
}

export function planImport(files: ImportFile[], ctx: PlanContext): ImportPlan {
  const seenInBatch = new Map<string, string>(); // questionId → first filename
  const items: PlannedImport[] = files.map((f) => {
    const ext = extensionOf(f.filename);
    if (!MASTER_EXT.has(ext) && !DELIVERY_EXT.has(ext)) {
      return {
        filename: f.filename,
        questionId: null,
        outcome: "unsupported_format",
        nextVersion: null,
        reason: `unsupported extension "${ext || "none"}"`,
      };
    }
    if (f.bytes <= 0) {
      return {
        filename: f.filename,
        questionId: null,
        outcome: "unsupported_format",
        nextVersion: null,
        reason: "empty file (0 bytes)",
      };
    }
    const id = questionIdFromFilename(f.filename);
    if (!id || !ctx.knownQuestionIds.has(id)) {
      return {
        filename: f.filename,
        questionId: id,
        outcome: "unmatched",
        nextVersion: null,
        reason: id ? `no question ${id}` : "filename does not encode a question id",
      };
    }
    const prior = seenInBatch.get(id);
    if (prior && extensionOf(prior) === ext) {
      return {
        filename: f.filename,
        questionId: id,
        outcome: "duplicate_version",
        nextVersion: null,
        reason: `duplicate of ${prior} in the same batch`,
      };
    }
    seenInBatch.set(id, f.filename);
    return {
      filename: f.filename,
      questionId: id,
      outcome: "matched",
      nextVersion: (ctx.existingVersions.get(id) ?? 0) + 1,
    };
  });

  return {
    items,
    matched: items.filter((i) => i.outcome === "matched").length,
    unmatched: items.filter((i) => i.outcome === "unmatched").length,
    duplicates: items.filter((i) => i.outcome === "duplicate_version").length,
    unsupported: items.filter((i) => i.outcome === "unsupported_format").length,
  };
}
