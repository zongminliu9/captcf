"use client";
import { grantBetaAccess, revokeBetaAccess } from "@/app/(app)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useState, useTransition } from "react";

/** Admin control to grant/revoke Premium for an invited Beta tester by email (no payment). */
export function BetaGrant() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: typeof grantBetaAccess) =>
    start(async () => {
      const res = await fn(email);
      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) setEmail("");
    });

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="courriel@testeur.com"
          aria-label="Courriel du testeur"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            disabled={pending || !email.trim()}
            onClick={() => run(grantBetaAccess)}
          >
            Accorder
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !email.trim()}
            onClick={() => run(revokeBetaAccess)}
          >
            Retirer
          </Button>
        </div>
      </div>
      {msg && (
        <p className={`mt-2 text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>
      )}
    </div>
  );
}
