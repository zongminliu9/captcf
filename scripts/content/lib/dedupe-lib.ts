/** Text similarity helpers for near-duplicate detection (n-gram / Jaccard). */

export function normText(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shingles(text: string, k = 3): Set<string> {
  const tokens = normText(text).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + k <= tokens.length; i++) out.add(tokens.slice(i, i + k).join(" "));
  if (out.size === 0 && tokens.length) out.add(tokens.join(" "));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Returns pairs [idA, idB, similarity] above the threshold. O(n²) — fine for a few hundred. */
export function jaccardDuplicates(
  items: { id: string; text: string }[],
  threshold = 0.82,
): [string, string, number][] {
  const sh = items.map((it) => ({ id: it.id, s: shingles(it.text) }));
  const pairs: [string, string, number][] = [];
  for (let i = 0; i < sh.length; i++) {
    for (let j = i + 1; j < sh.length; j++) {
      const score = jaccard(sh[i]!.s, sh[j]!.s);
      if (score >= threshold) pairs.push([sh[i]!.id, sh[j]!.id, score]);
    }
  }
  return pairs;
}

export function exactHashDuplicates(items: { id: string; text: string }[]): [string, string][] {
  const seen = new Map<string, string>();
  const dups: [string, string][] = [];
  for (const it of items) {
    const key = normText(it.text);
    if (seen.has(key)) dups.push([it.id, seen.get(key)!]);
    else seen.set(key, it.id);
  }
  return dups;
}
