import "server-only";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Pluggable file storage. Default = local disk (no cloud needed). S3/R2/Supabase
 * adapters can be added behind the same interface via STORAGE_DRIVER without touching
 * callers (see speaking submission routes).
 */
export interface StoredFile {
  buffer: Buffer;
  contentType: string;
}

export interface StorageDriver {
  save(key: string, buffer: Buffer, contentType: string): Promise<void>;
  read(key: string): Promise<StoredFile | null>;
  remove(key: string): Promise<void>;
}

const LOCAL_DIR = resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR ?? ".uploads");

const localDriver: StorageDriver = {
  async save(key, buffer, contentType) {
    if (!existsSync(LOCAL_DIR)) await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(resolve(LOCAL_DIR, safeKey(key)), buffer);
    await writeFile(resolve(LOCAL_DIR, `${safeKey(key)}.type`), contentType);
  },
  async read(key) {
    const path = resolve(LOCAL_DIR, safeKey(key));
    if (!existsSync(path)) return null;
    const buffer = await readFile(path);
    let contentType = "application/octet-stream";
    const typePath = `${path}.type`;
    if (existsSync(typePath)) contentType = (await readFile(typePath, "utf8")).trim();
    return { buffer, contentType };
  },
  async remove(key) {
    const path = resolve(LOCAL_DIR, safeKey(key));
    await rm(path, { force: true });
    await rm(`${path}.type`, { force: true });
  },
};

function safeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getStorage(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  switch (driver) {
    case "local":
      return localDriver;
    // s3 / r2 / supabase adapters plug in here when their env is configured
    default:
      return localDriver;
  }
}

export function extForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "mp4";
  if (mime.includes("wav")) return "wav";
  return "bin";
}
