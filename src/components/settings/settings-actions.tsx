"use client";
import { LogOut, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteAccountAction, logoutAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" onClick={() => start(() => logoutAction())} disabled={pending}>
      <LogOut className="h-4 w-4" /> Se déconnecter
    </Button>
  );
}

export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" className="text-danger hover:bg-danger-50" onClick={() => setConfirming(true)}>
        <Trash2 className="h-4 w-4" /> Supprimer mon compte
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-sm)] border border-danger/30 bg-danger-50 p-3">
      <span className="text-sm text-danger">
        Cette action est irréversible. Toutes vos données seront supprimées.
      </span>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Annuler
        </Button>
        <Button variant="danger" onClick={() => start(() => deleteAccountAction())} disabled={pending}>
          {pending ? "Suppression…" : "Confirmer la suppression"}
        </Button>
      </div>
    </div>
  );
}
