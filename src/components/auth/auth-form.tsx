"use client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/field";
import { type AuthState, loginAction, registerAction } from "@/lib/auth/actions";
import Link from "next/link";
import { useActionState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "register" ? registerAction : loginAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});

  return (
    <Card className="p-6 sm:p-8" raised>
      <h1 className="display text-2xl">
        {mode === "register" ? "Créer votre compte" : "Bon retour"}
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {mode === "register"
          ? "Conservez votre progression et vos analyses sur tous vos appareils."
          : "Connectez-vous pour retrouver votre plan d'étude."}
      </p>

      {state.error && (
        <Alert tone="danger" className="mt-4">
          {state.error}
        </Alert>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        {mode === "register" && (
          <div>
            <Label htmlFor="name">Nom (facultatif)</Label>
            <Input id="name" name="name" autoComplete="name" placeholder="Votre nom" />
          </div>
        )}
        <div>
          <Label htmlFor="email">Courriel</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@exemple.com"
            aria-invalid={!!state.fieldErrors?.email}
          />
          <FieldError>{state.fieldErrors?.email}</FieldError>
        </div>
        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            placeholder="••••••••"
            aria-invalid={!!state.fieldErrors?.password}
          />
          <FieldError>{state.fieldErrors?.password}</FieldError>
          {mode === "login" && (
            <div className="mt-1.5 text-right">
              <Link href="/forgot-password" className="text-sm text-navy hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
          )}
        </div>
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Un instant…" : mode === "register" ? "Créer mon compte" : "Se connecter"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {mode === "register" ? (
          <>
            Déjà un compte ?{" "}
            <Link href="/login" className="font-medium text-navy hover:underline">
              Se connecter
            </Link>
          </>
        ) : (
          <>
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-medium text-navy hover:underline">
              Créer un compte
            </Link>
          </>
        )}
      </p>

      {/* Demo credentials are shown only when explicitly enabled (never in the hosted beta/prod). */}
      {mode === "login" && process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "true" && (
        <div className="mt-5 rounded-[var(--radius-sm)] border border-border bg-surface-2 p-3 text-xs text-muted">
          <div className="font-medium text-ink">Comptes de démonstration</div>
          <div className="mt-1">demo@captcf.app · demo-captcf-2026 (premium)</div>
          <div>admin@captcf.app · admin-captcf-2026 (admin)</div>
        </div>
      )}
    </Card>
  );
}
