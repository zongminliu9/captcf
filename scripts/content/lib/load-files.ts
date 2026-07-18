import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { projectRoot } from "../../lib/env";
import type {
  ListeningItem,
  ReadingItem,
  SpeakingTask,
  VocabularyItem,
  WritingTask,
} from "@/lib/content/schema";

const DIR = resolve(projectRoot, "src/content");

function read<T>(name: string): T[] {
  const path = resolve(DIR, `${name}.json`);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf8")) as T[];
}

export function loadContent() {
  return {
    listening: read<ListeningItem>("listening"),
    reading: read<ReadingItem>("reading"),
    writing: read<WritingTask>("writing"),
    speaking: read<SpeakingTask>("speaking"),
    vocabulary: read<VocabularyItem>("vocabulary"),
  };
}

export const CONTENT_DIR = DIR;
