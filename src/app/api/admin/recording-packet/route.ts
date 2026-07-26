import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/** Download one question's recording packet (markdown) for a voice actor. */
export async function GET(req: NextRequest) {
  await requireAdmin();
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[a-z]+_[a-z0-9]+_\d{4}$/.test(id)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const [q] = await db
    .select({ cefr: questions.cefrLevel })
    .from(questions)
    .where(eq(questions.id, id))
    .limit(1);
  if (!q) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const md = await readFile(
      resolve(process.cwd(), `content/recording-packets/${q.cefr}/${id}.md`),
      "utf8",
    );
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${id}.md"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "packet_not_generated", hint: "run pnpm content:packets" },
      { status: 404 },
    );
  }
}
