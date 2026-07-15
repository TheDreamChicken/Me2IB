export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* PageHeader-shaped shimmer */}
      <div className="mb-6">
        <div className="h-8 w-64 max-w-full animate-pulse rounded-xl bg-brand-100/50" />
        <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded-lg bg-brand-100/50" />
      </div>

      {/* Stats row */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl bg-brand-100/50"
          />
        ))}
      </div>

      {/* Content cards */}
      <div className="mb-8 grid gap-3 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-brand-100/50" />
        <div className="h-56 animate-pulse rounded-2xl bg-brand-100/50" />
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-brand-100/50" />
    </div>
  );
}
