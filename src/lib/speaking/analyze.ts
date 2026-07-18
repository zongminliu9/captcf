/**
 * Local speaking self-evaluation — works with NO ASR/AI. Combines objectively measured
 * signals (duration, loudness, silence ratio captured in-browser) with a self-reported
 * coverage checklist to produce an explainable rubric and an UNOFFICIAL 0–20 estimate.
 */

export interface SpeakingSignals {
  durationSeconds: number;
  targetSeconds: number;
  avgVolume: number; // 0..1 (in-browser RMS estimate)
  silenceRatio: number; // 0..1
  coveredPoints: number; // self-reported points addressed
  totalPoints: number;
}

export interface SpeakingCriterion {
  key: string;
  labelFr: string;
  score: number; // 0..100
  detailFr: string;
}

export interface SpeakingAnalysis {
  criteria: SpeakingCriterion[];
  estimatedBand: number; // 0..20 UNOFFICIAL
  summaryFr: string;
  disclaimerFr: string;
  durationSeconds: number;
}

export function analyzeSpeaking(sig: SpeakingSignals): SpeakingAnalysis {
  const ratio = sig.targetSeconds ? sig.durationSeconds / sig.targetSeconds : 1;
  const durationScore =
    ratio >= 0.85 && ratio <= 1.25
      ? 100
      : ratio < 0.85
        ? Math.round(clamp01(ratio / 0.85) * 90)
        : Math.max(55, 100 - Math.round((ratio - 1.25) * 60));

  const volumeScore =
    sig.avgVolume >= 0.18 ? 100 : sig.avgVolume >= 0.08 ? 70 : sig.avgVolume > 0.02 ? 45 : 20;

  const fluencyScore =
    sig.silenceRatio <= 0.25 ? 100 : sig.silenceRatio <= 0.45 ? 75 : sig.silenceRatio <= 0.6 ? 50 : 30;

  const coverageScore = sig.totalPoints ? Math.round((sig.coveredPoints / sig.totalPoints) * 100) : 0;

  const criteria: SpeakingCriterion[] = [
    {
      key: "duration",
      labelFr: "Durée de la réponse",
      score: clamp(durationScore),
      detailFr: `${Math.round(sig.durationSeconds)} s enregistrées (cible ~${sig.targetSeconds} s).`,
    },
    {
      key: "audibility",
      labelFr: "Audibilité (volume)",
      score: clamp(volumeScore),
      detailFr:
        sig.avgVolume >= 0.18
          ? "Volume clair et bien audible."
          : sig.avgVolume > 0.02
            ? "Volume un peu faible : rapprochez-vous du micro et parlez plus fort."
            : "Presque aucun son détecté — vérifiez votre micro.",
    },
    {
      key: "fluency",
      labelFr: "Fluidité (pauses)",
      score: clamp(fluencyScore),
      detailFr:
        sig.silenceRatio <= 0.25
          ? "Débit fluide, peu d'hésitations."
          : `Environ ${Math.round(sig.silenceRatio * 100)} % de silence — travaillez la continuité.`,
    },
    {
      key: "coverage",
      labelFr: "Points de la tâche abordés",
      score: clamp(coverageScore),
      detailFr: `${sig.coveredPoints}/${sig.totalPoints} points cochés dans votre auto-évaluation.`,
    },
  ];

  const avg = criteria.reduce((s, c) => s + c.score, 0) / criteria.length;
  const estimatedBand = Math.round((avg / 100) * 20);

  const summaryFr =
    volumeScore < 50
      ? "On vous entend mal : refaites l'enregistrement en parlant plus fort et plus près du micro."
      : durationScore < 60
        ? "Votre réponse est trop courte : développez davantage vos idées."
        : coverageScore < 60
          ? "Pensez à couvrir tous les points demandés par la tâche."
          : "Bonne prise de parole : durée, audibilité et contenu sont cohérents.";

  return {
    criteria,
    estimatedBand,
    summaryFr,
    disclaimerFr:
      "Auto-évaluation locale à titre indicatif. Sans reconnaissance vocale, la prononciation et la grammaire ne sont pas notées ici — ce n'est pas une note officielle.",
    durationSeconds: sig.durationSeconds,
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
