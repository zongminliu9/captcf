/**
 * Generate human-recording packets for every listening item, so a real voice actor (or a licensed
 * studio) can record originals that replace the prototype TTS. Produces:
 *   - content/recording-packets/<cefr>/<id>.md   (one per item, actor-readable)
 *   - content/recording-manifest.csv             (index / progress tracker)
 *   - content/pronunciation-guide.md             (aggregated names, places, numbers)
 * Technical + workflow standards live in docs/AUDIO_RECORDING_GUIDE.md.
 *
 * No audio is produced here — this only tells you exactly WHAT to record.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ListeningItem } from "@/lib/content/schema";
import { projectRoot } from "../lib/env";
import { loadContent } from "./lib/load-files";

const OUT = resolve(projectRoot, "content");
const PACKETS = resolve(OUT, "recording-packets");

const ROSTER: Record<string, { label: string; spec: string }> = {
  narrator: {
    label: "Narrateur / Narratrice",
    spec: "Voix neutre et posée, style radio/annonce, débit régulier.",
  },
  f1: {
    label: "Femme adulte A",
    spec: "25–40 ans, français standard, voix claire et chaleureuse.",
  },
  f2: {
    label: "Femme adulte B",
    spec: "30–45 ans, français canadien compréhensible, ton naturel.",
  },
  m1: { label: "Homme adulte A", spec: "25–40 ans, français standard, voix posée." },
  m2: { label: "Homme adulte B", spec: "30–45 ans, français canadien compréhensible." },
  elder_f: {
    label: "Femme âgée",
    spec: "55 ans et plus, débit un peu plus lent, articulation soignée.",
  },
  elder_m: {
    label: "Homme âgé",
    spec: "55 ans et plus, débit un peu plus lent, articulation soignée.",
  },
  youth: { label: "Jeune", spec: "16–22 ans, énergie naturelle, débit vif mais clair." },
};

const STOP = new Set([
  "Le",
  "La",
  "Les",
  "Un",
  "Une",
  "Des",
  "Je",
  "Tu",
  "Il",
  "Elle",
  "On",
  "Nous",
  "Vous",
  "Ils",
  "Elles",
  "Bonjour",
  "Merci",
  "Oui",
  "Non",
  "Alors",
  "Donc",
  "Mais",
  "Et",
  "Ou",
  "Où",
  "Que",
  "Qui",
  "Quoi",
  "Comment",
  "Pourquoi",
  "Quand",
  "Est",
  "C'est",
  "Ce",
  "Cette",
  "Voilà",
  "Attendez",
  "Excusez",
  "Pardon",
  "D'accord",
  "Bien",
  "Très",
  "Pour",
  "Avec",
  "Dans",
  "Sur",
  "À",
  "Au",
  "Aux",
]);

/** Heuristic: proper nouns = capitalised tokens (names, places, brands). Unicode-aware. */
function properNouns(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/(?<=^|[\s(«"'“\-–—])(\p{Lu}[\p{L}'’-]{2,})/gu)) {
    const w = m[1]!;
    if (STOP.has(w)) continue;
    if (/^(Qu|C|J|L|D|N|S|T|M)['’]/.test(w)) continue; // capitalised contraction, not a name
    out.add(w);
  }
  return [...out];
}

function numbers(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d+(?:[.,:h]\d+)*\s?(?:€|\$|%|h|heures?)?/g)) {
    const v = m[0]!.trim().replace(/[.,]$/, "");
    if (v) out.add(v);
  }
  return [...out];
}

function paceHint(rate: number | undefined, cefr: string): string {
  if (rate) return `~${rate} mots/min`;
  return ["A1", "A2"].includes(cefr) ? "débit lent et clair" : "débit naturel";
}

function packetMd(item: ListeningItem): string {
  const roles = [...new Set(item.audio.lines.map((l) => l.voice))];
  const names = new Set<string>();
  const nums = new Set<string>();
  for (const l of item.audio.lines) {
    for (const n of properNouns(l.text)) names.add(n);
    for (const n of numbers(l.text)) nums.add(n);
    if (l.speaker && /^[A-ZÀ-Ÿ][a-zà-ÿ]+$/.test(l.speaker)) names.add(l.speaker);
  }
  const target = item.audio.durationSeconds ?? item.estimatedSeconds ?? null;

  const lines = item.audio.lines
    .map((l) => {
      const r = ROSTER[l.voice] ?? { label: l.voice, spec: "" };
      return `**${l.speaker}** — _${r.label}, ${paceHint(l.rate, item.cefrLevel)}_\n> ${l.text}`;
    })
    .join("\n\n");

  return `# Packet d'enregistrement — \`${item.id}\`

- **Niveau** : ${item.cefrLevel} (NCLC ${item.targetNclc}) · **Thème** : ${item.topic} · **Type** : ${item.subtype}
- **Livrer** : master \`${item.id}.wav\` (48 kHz / 24-bit) → livraison web \`${item.id}.m4a\`
- **Durée cible** : ${target ? `~${Math.round(target)} s` : "naturelle (2 répliques ≈ 8–15 s)"}
- **Contexte** (NON lu à voix haute — affiché au candidat) : ${item.audio.context}

## Distribution
${roles.map((v) => `- **${v}** → ${(ROSTER[v] ?? { label: v }).label} : ${(ROSTER[v] ?? { spec: "" }).spec}`).join("\n")}

## Script — lire uniquement le texte après « > »
${lines}

_Marquer une pause naturelle entre les répliques ; ne pas enchaîner._

## Prononciation
- **Noms / lieux** : ${names.size ? [...names].join(", ") : "—"}
- **Nombres** : ${nums.size ? [...nums].join(", ") : "—"} — lire en toutes lettres, naturellement (ex. « à neuf heures »).
- Se référer aussi à \`pronunciation-guide.md\`.

## Interdictions
- Aucun bruitage ni effet (sonnerie, musique, réverbération artificielle) sauf indication de scène.
- Voix **humaine réelle** uniquement — pas de clonage vocal par IA.
- Ne pas couper le début/la fin ; laisser ~200–400 ms de silence de part et d'autre.
`;
}

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main() {
  const { listening } = loadContent();
  const published = listening.filter((l) => l.status === "published");
  mkdirSync(PACKETS, { recursive: true });

  const manifest: string[] = [
    "id,delivery_file,master_file,cefr,topic,subtype,roles,line_count,target_seconds,record_status",
  ];
  const allNames = new Set<string>();

  for (const item of published) {
    const dir = resolve(PACKETS, item.cefrLevel);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, `${item.id}.md`), packetMd(item));

    const roles = [...new Set(item.audio.lines.map((l) => l.voice))].join("|");
    const target = item.audio.durationSeconds ?? item.estimatedSeconds ?? "";
    manifest.push(
      [
        item.id,
        `${item.id}.m4a`,
        `${item.id}.wav`,
        item.cefrLevel,
        item.topic,
        item.subtype,
        roles,
        String(item.audio.lines.length),
        String(target),
        "awaiting_recording",
      ]
        .map(csvCell)
        .join(","),
    );
    for (const l of item.audio.lines) for (const n of properNouns(l.text)) allNames.add(n);
  }

  writeFileSync(resolve(OUT, "recording-manifest.csv"), `${manifest.join("\n")}\n`);

  const guide = `# Guide de prononciation (agrégé)

Noms propres et lieux rencontrés dans les scripts d'écoute. Sauf indication, prononciation
française standard, naturelle. Garder la même prononciation d'un enregistrement à l'autre.

${[...allNames]
  .sort((a, b) => a.localeCompare(b, "fr"))
  .map((n) => `- **${n}**`)
  .join("\n")}

## Nombres, heures, prix
- Heures : « neuf heures », « quatorze heures trente » — jamais « 9h ».
- Prix : « douze euros cinquante », « vingt dollars ».
- Numéros (bus, salle) : chiffre par chiffre si naturel, sinon en toutes lettres.
`;
  writeFileSync(resolve(OUT, "pronunciation-guide.md"), guide);

  console.log(
    JSON.stringify({
      packets: published.length,
      outDir: "content/recording-packets/",
      manifest: "content/recording-manifest.csv",
      guide: "content/pronunciation-guide.md",
      recordingsNeeded: published.length,
    }),
  );
}

main();
