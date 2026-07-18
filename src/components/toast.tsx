"use client";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "info" | "success" | "error";
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<{
  toast: (message: string, tone?: ToastTone) => void;
} | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? XCircle : Info;
          return (
            <div
              key={t.id}
              className={cn(
                "rise-in pointer-events-auto flex max-w-md items-start gap-2.5 rounded-[var(--radius-sm)] border px-4 py-3 text-sm shadow-lg",
                t.tone === "success" && "border-success/25 bg-success-50 text-success",
                t.tone === "error" && "border-danger/25 bg-danger-50 text-danger",
                t.tone === "info" && "border-navy-100 bg-navy-50 text-navy",
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-relaxed">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="ml-1 shrink-0 opacity-60 hover:opacity-100"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
