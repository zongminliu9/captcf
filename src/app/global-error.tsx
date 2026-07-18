"use client";
// Root error boundary — replaces the root layout, so it renders its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f5f1",
          color: "#1c2431",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Erreur inattendue</h1>
          <p style={{ marginTop: "0.5rem", color: "#5c6470" }}>
            L'application a rencontré un problème. Réessayez.
          </p>
          {error.digest && (
            <p style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#8a8f99" }}>
              réf. {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              height: "2.75rem",
              padding: "0 1.25rem",
              borderRadius: "0.5rem",
              background: "#1f3a5f",
              color: "#f7fafc",
              border: "none",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
