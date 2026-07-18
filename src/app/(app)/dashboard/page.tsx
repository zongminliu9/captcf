import { ArrowRight, CalendarClock, Clock, Flame, Sparkles, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { getActor } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/dashboard/data";
import { EXAM_SPEC, type SkillId } from "@/lib/exam/config";
import { overallNclc } from "@/lib/exam/nclc";
import { masteryLabel } from "@/lib/mastery";
import type { Recommendation } from "@/lib/recommend";
import { getT } from "@/lib/i18n/server";
import { formatMinutes } from "@/lib/utils";

export const dynamic = "force-dynamic";

function ctaFor(rec: Recommendation): string {
  if (rec.action === "mock") return "/mock";
  if (rec.action === "review_due") return "/practice/start?mode=review";
  switch (rec.skill) {
    case "listening":
      return "/practice/start?mode=listening";
    case "reading":
      return "/practice/start?mode=reading";
    case "writing":
      return "/writing";
    case "speaking":
      return "/speaking";
    default:
      return "/practice/start?mode=quick";
  }
}

export default async function DashboardPage() {
  const actor = await getActor();
  const { t } = await getT();

  if (!actor) {
    return <EmptyHero t={t} />;
  }

  const data = await getDashboardData(actor);
  const skillLabel = (s: SkillId) => t(`skill.${s}`);
  const reasonText = (rec: Recommendation) =>
    rec.action === "mock"
      ? t("reason.mock", rec.params)
      : t(`reason.${rec.reasonCode}`, { ...rec.params, skill: rec.skill ? skillLabel(rec.skill) : "" });

  const primary = data.recommendations[0] ?? null;
  const currentNclc = overallNclc(
    Object.fromEntries(data.snapshots.filter((s) => s.attempts > 0).map((s) => [s.skill, s.estimatedNclc])),
  );

  if (!data.hasData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <StatsRow streak={0} weekly={0} due={0} />
        <EmptyHero t={t} inApp />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-3xl">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted">Votre séance recommandée du jour.</p>
        </div>
        <StatsRow streak={data.streakDays} weekly={data.weeklyMinutes} due={data.dueReviewCount} inline />
      </div>

      {/* primary recommendation hero */}
      {primary ? (
        <Card className="overflow-hidden" raised>
          <div className="border-l-4 border-navy p-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy">
              <Target className="h-4 w-4" /> Aujourd'hui
            </div>
            <h2 className="mt-2 text-xl font-semibold leading-snug">{reasonText(primary)}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> ~{primary.estimatedMinutes} min
              </span>
              <Badge variant="navy" size="sm">
                {primary.reasonCode}
              </Badge>
            </div>
            <Button asChild variant="primary" className="mt-5">
              <a href={ctaFor(primary)}>
                {t("cta.start")} <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6" raised>
          <h2 className="text-lg font-semibold">Tout est à jour 🎉</h2>
          <p className="mt-1 text-sm text-muted">
            Aucune révision urgente. Continuez avec une séance rapide pour progresser.
          </p>
          <Button asChild variant="primary" className="mt-4">
            <a href="/practice/start?mode=quick">{t("cta.start_free")}</a>
          </Button>
        </Card>
      )}

      {/* goal + skills */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted">
            <TrendingUp className="h-4 w-4" /> Objectif NCLC
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-semibold text-navy">{currentNclc || "—"}</span>
            <span className="pb-1 text-sm text-muted">/ {data.goal?.targetNclc ?? 7}</span>
          </div>
          <Meter
            className="mt-3"
            value={data.goal ? Math.min(1, currentNclc / data.goal.targetNclc) : 0}
            tone="navy"
          />
          {data.goal?.examDate && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <CalendarClock className="h-3.5 w-3.5" /> Examen le {data.goal.examDate}
            </p>
          )}
          {!data.goal && (
            <Link href="/onboarding" className="mt-2 inline-block text-xs font-medium text-navy hover:underline">
              Définir mon objectif →
            </Link>
          )}
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          {data.snapshots.map((s) => (
            <Card key={s.skill} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{EXAM_SPEC[s.skill].labelFr}</span>
                {s.dueReviewCount > 0 && (
                  <Badge variant="accent" size="sm">
                    {s.dueReviewCount} à revoir
                  </Badge>
                )}
              </div>
              <Meter
                className="mt-2.5"
                value={s.mastery}
                tone={s.mastery < 0.5 ? "accent" : s.mastery < 0.8 ? "gold" : "success"}
                showValue
              />
              <p className="mt-1.5 text-xs text-muted">
                {s.attempts > 0 ? `NCLC ~${s.estimatedNclc} · ${maturity(s.mastery)}` : "Non commencé"}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* secondary recommendations */}
      {data.recommendations.length > 1 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-muted">Autres priorités</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.recommendations.slice(1, 4).map((rec) => (
              <a
                key={rec.id}
                href={ctaFor(rec)}
                className="card flex items-center gap-3 p-4 transition hover:border-border-strong hover:bg-surface-2"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-gold" />
                <span className="flex-1 text-sm text-ink">{reasonText(rec)}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* recent activity */}
      {data.recentAttempts.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-muted">Activité récente</h3>
          <div className="space-y-2">
            {data.recentAttempts.map((a) => {
              const answered = Object.values(a.perSkill as Record<string, { answered: number }>).reduce(
                (s, v) => s + v.answered,
                0,
              );
              return (
                <Link
                  key={a.id}
                  href={`/attempts/${a.id}/results`}
                  className="card flex items-center gap-3 p-3.5 transition hover:bg-surface-2"
                >
                  <Badge variant="outline" size="sm">
                    {a.mode}
                  </Badge>
                  <span className="text-sm text-ink">
                    {a.correctItems}/{answered} correctes
                  </span>
                  <span className="ml-auto text-xs text-muted">
                    {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("fr-CA") : ""}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function maturity(m: number): string {
  const label = masteryLabel(m);
  return { novice: "débutant", developing: "en progrès", proficient: "solide", strong: "maîtrisé" }[label];
}

function StatsRow({
  streak,
  weekly,
  due,
  inline,
}: {
  streak: number;
  weekly: number;
  due: number;
  inline?: boolean;
}) {
  const items = [
    { icon: Flame, label: "Série", value: `${streak} j` },
    { icon: Clock, label: "Cette semaine", value: formatMinutes(weekly * 60) },
    { icon: TrendingUp, label: "À réviser", value: String(due) },
  ];
  return (
    <div className={inline ? "flex gap-4" : "mb-6 grid grid-cols-3 gap-3"}>
      {items.map((it) => (
        <div key={it.label} className={inline ? "text-right" : "card p-4"}>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <it.icon className="h-3.5 w-3.5" /> {it.label}
          </div>
          <div className="mt-0.5 text-lg font-semibold text-ink tabular-nums">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyHero({ t, inApp }: { t: (k: string) => string; inApp?: boolean }) {
  return (
    <div className={inApp ? "" : "mx-auto max-w-2xl px-4 py-16 text-center"}>
      <Card className="p-8 text-center" raised>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-navy-50">
          <Sparkles className="h-7 w-7 text-navy" />
        </div>
        <h1 className="display text-2xl">Commençons votre préparation</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Faites un test de diagnostic rapide pour situer votre niveau, ou lancez une première
          séance. Aucune donnée n'est perdue si vous créez un compte ensuite.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="primary">
            <a href="/practice/start?mode=diagnostic">Test de diagnostic</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/practice/start?mode=quick">{t("cta.start_free")}</a>
          </Button>
        </div>
      </Card>
    </div>
  );
}
