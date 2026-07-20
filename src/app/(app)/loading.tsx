/** Fallback skeleton shown while any authed page's server data loads — no blank screen, no spinner. */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="skeleton h-8 w-48 rounded-md" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-24 rounded-[var(--radius)]" />
        ))}
      </div>
      <div className="skeleton mt-6 h-64 rounded-[var(--radius)]" />
    </div>
  );
}
