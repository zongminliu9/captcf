import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { speakingSubmissions } from "@/db/schema";
import { ownerEq } from "@/lib/auth/owner";
import { getActor } from "@/lib/auth/session";
import { getStorage } from "@/lib/storage";

/** Streams a speaking recording back, but only to its owner. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return new NextResponse("Unauthorized", { status: 401 });

  const rows = await db
    .select({ audioFile: speakingSubmissions.audioFile })
    .from(speakingSubmissions)
    .where(and(eq(speakingSubmissions.id, id), ownerEq(speakingSubmissions, actor)))
    .limit(1);
  const sub = rows[0];
  if (!sub?.audioFile) return new NextResponse("Not found", { status: 404 });

  const file = await getStorage().read(sub.audioFile);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(file.buffer.length),
    },
  });
}
