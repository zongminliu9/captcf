import { db } from "@/db";
import {
  audioAssets,
  entitlements,
  examGoals,
  mockItems,
  mockSections,
  mockTests,
  options,
  profiles,
  questions,
  speakingTasks,
  subscriptions,
  users,
  vocabularyItems,
  writingTasks,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { assembleMocks } from "@/lib/exam/assemble";
import { type CefrLevel, EXAM_SPEC, SPEC_VERSION } from "@/lib/exam/config";
/**
 * Seed the database from the audited content bank. Idempotent (upserts by id; rebuilds
 * mock forms + options in place). Creates dev demo accounts unless NODE_ENV=production.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq, inArray, sql } from "drizzle-orm";
import { loadContent } from "./content/lib/load-files";
import { loadEnv, projectRoot } from "./lib/env";

loadEnv();

const OPTION_ORDER: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };

async function chunk<T>(rows: T[], size: number, fn: (batch: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function seedContent() {
  const c = loadContent();
  const now = new Date();

  // audio QA manifest (quality tier + metrics per clip)
  const manifestPath = resolve(projectRoot, "public/audio/manifest.json");
  const manifest: Record<string, any> = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : {};

  // audio assets (listening)
  const audioRows = c.listening
    .filter((l) => l.audio.file)
    .map((l) => ({
      id: l.id,
      file: l.audio.file!,
      durationSeconds: String(l.audio.durationSeconds ?? 0),
      textHash: manifest[l.id]?.textHash ?? l.id,
      voices: [...new Set(l.audio.lines.map((x) => x.voice))],
      status: "generated",
      quality: manifest[l.id]?.quality ?? "prototype_tts",
      qa: manifest[l.id]?.qa ?? null,
    }));
  await chunk(audioRows, 200, async (batch) => {
    await db
      .insert(audioAssets)
      .values(batch)
      .onConflictDoUpdate({
        target: audioAssets.id,
        set: {
          file: sql`excluded.file`,
          durationSeconds: sql`excluded.duration_seconds`,
          voices: sql`excluded.voices`,
          quality: sql`excluded.quality`,
          qa: sql`excluded.qa`,
        },
      });
  });

  // questions (listening + reading)
  const qRows = [
    ...c.listening.map((l) => ({
      id: l.id,
      slug: l.slug,
      version: l.version,
      status: l.status,
      skill: "listening" as const,
      subtype: l.subtype,
      topic: l.topic,
      cefrLevel: l.cefrLevel,
      targetNclc: l.targetNclc,
      stem: l.stem,
      correctAnswer: l.correctAnswer,
      explanation: l.explanation,
      distractorRationales: l.distractorRationales,
      stimulus: { kind: "audio", context: l.audio.context, transcript: l.transcript },
      vocabulary: l.vocabulary,
      estimatedSeconds: l.estimatedSeconds,
      difficultyEvidence: l.difficultyEvidence,
      qualityScore: l.qualityScore,
      author: l.author,
      reviewer: l.reviewer,
      sourceType: l.sourceType,
      passageId: null,
      audioId: l.id,
      publishedAt: now,
    })),
    ...c.reading.map((r) => ({
      id: r.id,
      slug: r.slug,
      version: r.version,
      status: r.status,
      skill: "reading" as const,
      subtype: r.subtype,
      topic: r.topic,
      cefrLevel: r.cefrLevel,
      targetNclc: r.targetNclc,
      stem: r.stem,
      correctAnswer: r.correctAnswer,
      explanation: r.explanation,
      distractorRationales: r.distractorRationales,
      stimulus: { kind: "text", title: r.passage.title, text: r.passage.text },
      vocabulary: r.vocabulary,
      estimatedSeconds: r.estimatedSeconds,
      difficultyEvidence: r.difficultyEvidence,
      qualityScore: r.qualityScore,
      author: r.author,
      reviewer: r.reviewer,
      sourceType: r.sourceType,
      passageId: r.passageId,
      audioId: null,
      publishedAt: now,
    })),
  ];
  await chunk(qRows, 150, async (batch) => {
    await db
      .insert(questions)
      .values(batch)
      .onConflictDoUpdate({
        target: questions.id,
        set: {
          stem: sql`excluded.stem`,
          correctAnswer: sql`excluded.correct_answer`,
          explanation: sql`excluded.explanation`,
          distractorRationales: sql`excluded.distractor_rationales`,
          stimulus: sql`excluded.stimulus`,
          vocabulary: sql`excluded.vocabulary`,
          audioId: sql`excluded.audio_id`,
          updatedAt: now,
        },
      });
  });

  // options — replace per question
  const allQids = qRows.map((q) => q.id);
  await chunk(allQids, 200, async (batch) => {
    await db.delete(options).where(inArray(options.questionId, batch));
  });
  const optRows = [...c.listening, ...c.reading].flatMap((q) =>
    q.options.map((o) => ({
      questionId: q.id,
      optionId: o.id,
      text: o.text,
      orderIndex: OPTION_ORDER[o.id] ?? 0,
    })),
  );
  await chunk(optRows, 400, async (batch) => {
    await db.insert(options).values(batch);
  });

  // writing tasks
  await chunk(c.writing, 100, async (batch) => {
    await db
      .insert(writingTasks)
      .values(batch.map((w) => ({ ...w })))
      .onConflictDoUpdate({
        target: writingTasks.id,
        set: {
          promptFr: sql`excluded.prompt_fr`,
          modelAnswerFr: sql`excluded.model_answer_fr`,
          updatedAt: new Date(),
        },
      });
  });

  // speaking tasks
  await chunk(c.speaking, 100, async (batch) => {
    await db
      .insert(speakingTasks)
      .values(batch.map((s) => ({ ...s })))
      .onConflictDoUpdate({
        target: speakingTasks.id,
        set: {
          promptFr: sql`excluded.prompt_fr`,
          modelOutlineFr: sql`excluded.model_outline_fr`,
          updatedAt: new Date(),
        },
      });
  });

  // vocabulary
  const vocabRows = c.vocabulary.map((v) => ({
    id: v.id,
    term: v.term,
    partOfSpeech: v.partOfSpeech,
    cefrLevel: v.cefrLevel,
    topic: v.topic,
    definitionFr: v.definitionFr,
    glossEn: v.gloss_en,
    glossZh: v.gloss_zh,
    exampleFr: v.exampleFr,
    register: v.register,
    author: v.author,
  }));
  await chunk(vocabRows, 300, async (batch) => {
    await db
      .insert(vocabularyItems)
      .values(batch)
      .onConflictDoUpdate({
        target: vocabularyItems.id,
        set: { definitionFr: sql`excluded.definition_fr` },
      });
  });

  return {
    listening: c.listening.length,
    reading: c.reading.length,
    writing: c.writing.length,
    speaking: c.speaking.length,
    vocabulary: c.vocabulary.length,
    bank: c,
  };
}

async function seedMocks(c: ReturnType<typeof loadContent>) {
  const result = assembleMocks(
    {
      listening: c.listening.map((l) => ({ id: l.id, cefrLevel: l.cefrLevel as CefrLevel })),
      reading: c.reading.map((r) => ({ id: r.id, cefrLevel: r.cefrLevel as CefrLevel })),
      writing: c.writing.map((w) => ({ id: w.id, taskNumber: w.taskNumber })),
      speaking: c.speaking.map((s) => ({ id: s.id, taskNumber: s.taskNumber })),
    },
    4,
  );

  for (const form of result.forms) {
    const id = `mock_form_${form.formNumber}`;
    const isSample = form.formNumber === 1;
    await db
      .insert(mockTests)
      .values({
        id,
        slug: `examen-blanc-${form.formNumber}`,
        formNumber: form.formNumber,
        title: `Examen blanc ${form.formNumber}`,
        description: `Examen blanc complet ${form.formNumber} — 4 épreuves conformes à la structure officielle du TCF Canada.`,
        specVersion: SPEC_VERSION,
        isSample,
        status: "published",
      })
      .onConflictDoUpdate({ target: mockTests.id, set: { updatedAt: new Date(), isSample } });

    const sectionDefs = [
      { skill: "listening" as const, order: 0, items: form.listening, refType: "question" },
      { skill: "reading" as const, order: 1, items: form.reading, refType: "question" },
      { skill: "writing" as const, order: 2, items: form.writing, refType: "writing_task" },
      { skill: "speaking" as const, order: 3, items: form.speaking, refType: "speaking_task" },
    ];
    for (const sec of sectionDefs) {
      const [section] = await db
        .insert(mockSections)
        .values({
          mockTestId: id,
          skill: sec.skill,
          orderIndex: sec.order,
          durationSeconds: EXAM_SPEC[sec.skill].durationSeconds,
        })
        .onConflictDoUpdate({
          target: [mockSections.mockTestId, mockSections.skill],
          set: { durationSeconds: EXAM_SPEC[sec.skill].durationSeconds },
        })
        .returning({ id: mockSections.id });
      await db.delete(mockItems).where(eq(mockItems.mockSectionId, section!.id));
      await db.insert(mockItems).values(
        sec.items.map((refId, i) => ({
          mockSectionId: section!.id,
          refType: sec.refType,
          refId,
          orderIndex: i,
        })),
      );
    }
  }
  return result;
}

async function seedDemoUsers() {
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_DEMO_ACCOUNTS === "false") {
    return [];
  }
  const demoUsers = [
    {
      email: "demo@captcf.app",
      name: "Demo Apprenant",
      password: "demo-captcf-2026",
      role: "user" as const,
      plan: "premium" as const,
    },
    {
      email: "free@captcf.app",
      name: "Free Apprenant",
      password: "demo-captcf-2026",
      role: "user" as const,
      plan: "free" as const,
    },
    {
      email: "admin@captcf.app",
      name: "Admin CapTCF",
      password: "admin-captcf-2026",
      role: "admin" as const,
      plan: "premium" as const,
    },
  ];
  const created: string[] = [];
  for (const u of demoUsers) {
    const passwordHash = await hashPassword(u.password);
    const [row] = await db
      .insert(users)
      .values({ email: u.email, passwordHash, name: u.name, role: u.role, isDemo: true })
      .onConflictDoUpdate({
        target: users.email,
        set: { passwordHash, name: u.name, role: u.role, isDemo: true },
      })
      .returning({ id: users.id });
    const userId = row!.id;

    await db
      .insert(subscriptions)
      .values({ userId, plan: u.plan, status: "active", provider: "simulator" })
      .onConflictDoUpdate({ target: subscriptions.userId, set: { plan: u.plan } });
    if (u.plan === "premium") {
      await db.delete(entitlements).where(eq(entitlements.userId, userId));
      await db.insert(entitlements).values({ userId, plan: "premium", source: "simulator" });
    }
    // a default goal so recommendations work out of the box
    await db
      .insert(examGoals)
      .values({
        userId,
        targetNclc: 7,
        weeklyDays: 5,
        dailyMinutes: 30,
        focusSkills: ["listening", "speaking"],
      })
      .onConflictDoUpdate({ target: examGoals.userId, set: { targetNclc: 7 } });
    await db
      .insert(profiles)
      .values({ userId, currentLevel: "B1", onboardedAt: new Date() })
      .onConflictDoUpdate({ target: profiles.userId, set: { currentLevel: "B1" } });
    created.push(`${u.email} (${u.plan}${u.role === "admin" ? ", admin" : ""})`);
  }
  return created;
}

async function main() {
  console.log("→ Seeding content…");
  const stats = await seedContent();
  console.log(
    `  questions: ${stats.listening + stats.reading} (listening ${stats.listening}, reading ${stats.reading})`,
  );
  console.log(
    `  writing ${stats.writing}, speaking ${stats.speaking}, vocabulary ${stats.vocabulary}`,
  );

  console.log("→ Assembling mock exams…");
  const mocks = await seedMocks(stats.bank);
  console.log(
    `  4 forms · listening reuse ≤${mocks.overlap.listeningMaxUses}, reading reuse ≤${mocks.overlap.readingMaxUses}`,
  );
  if (mocks.warnings.length) for (const w of mocks.warnings) console.log(`  ! ${w}`);

  console.log("→ Demo accounts…");
  const demo = await seedDemoUsers();
  for (const d of demo) console.log(`  ${d}`);

  console.log("✓ Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
