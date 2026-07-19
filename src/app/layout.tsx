import { ThemeScript } from "@/components/theme";
import { ToastProvider } from "@/components/toast";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_URL ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "CapTCF — Préparation intelligente au TCF Canada",
    template: "%s · CapTCF",
  },
  description:
    "Entraînez-vous au TCF Canada : compréhension orale et écrite, expression écrite et orale, examens blancs conformes à la structure officielle, et un plan d'étude personnalisé.",
  applicationName: "CapTCF",
  keywords: ["TCF Canada", "français", "NCLC", "CLB", "immigration", "préparation", "examen blanc"],
  authors: [{ name: "CapTCF" }],
  openGraph: {
    type: "website",
    title: "CapTCF — Préparation intelligente au TCF Canada",
    description:
      "Un système de préparation qui repère vos points faibles et décide quoi travailler ensuite.",
    siteName: "CapTCF",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1520" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="skip-link">
          Aller au contenu principal
        </a>
        <I18nProvider locale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
