"use client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/field";
import { type ResetState, requestResetAction, resetPasswordAction } from "@/lib/auth/actions";
import Link from "next/link";
import { useActionState } from "react";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(requestResetAction, {});
  return (
    <Card className="p-6 sm:p-8" raised>
      <h1 className="display text-2xl">Mot de passe oublié</h1>
      <p className="mt-1.5 text-sm text-muted">
        Entrez votre courriel : nous vous enverrons un lien de réinitialisation.
      </p>
      {state.sent ? (
        <Alert tone="success" className="mt-5">
          Si un compte existe pour cette adresse, un lien vient d'être envoyé. En développement, le
          lien s'affiche dans la console du serveur.
        </Alert>
      ) : (
        <form action={action} className="mt-6 space-y-4">
          {state.error && <Alert tone="danger">{state.error}</Alert>}
          <div>
            <Label htmlFor="email">Courriel</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="vous@exemple.com"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={pending}>
            {pending ? "Envoi…" : "Envoyer le lien"}
          </Button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-navy hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </Card>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPasswordAction, {});
  return (
    <Card className="p-6 sm:p-8" raised>
      <h1 className="display text-2xl">Nouveau mot de passe</h1>
      {state.done ? (
        <>
          <Alert tone="success" className="mt-5">
            Mot de passe mis à jour. Vous pouvez maintenant vous connecter.
          </Alert>
          <Button asChild variant="primary" className="mt-5 w-full">
            <Link href="/login">Se connecter</Link>
          </Button>
        </>
      ) : (
        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          {state.error && <Alert tone="danger">{state.error}</Alert>}
          <div>
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
            />
            <FieldError>{state.error?.includes("faible") ? state.error : undefined}</FieldError>
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={pending}>
            {pending ? "Un instant…" : "Réinitialiser"}
          </Button>
        </form>
      )}
    </Card>
  );
}
