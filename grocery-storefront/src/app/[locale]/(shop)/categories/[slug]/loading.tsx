function ProductTileSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-[1.25rem] border bg-[var(--color-card)]"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="aspect-square skeleton" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-4/5 rounded skeleton" />
        <div className="h-5 w-20 rounded skeleton" />
        <div className="flex items-center justify-between gap-3">
          <div className="h-9 w-24 rounded-full skeleton" />
          <div className="h-9 flex-1 rounded-full skeleton" />
        </div>
      </div>
    </div>
  );
}

export default function CategoryLoading() {
  return (
    <div className="container-grocery py-8 md:py-12">
      <div className="mb-6 h-5 w-32 rounded skeleton" />

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl flex-1 space-y-3">
          <div className="h-3 w-28 rounded skeleton" />
          <div className="h-9 w-64 max-w-full rounded skeleton" />
          <div className="h-4 w-full rounded skeleton" />
          <div className="h-4 w-2/3 rounded skeleton" />
        </div>
        <div className="h-8 w-28 rounded-full skeleton" />
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-[17.5rem] shrink-0 space-y-5 lg:block">
          <div
            className="rounded-[1.15rem] border bg-[var(--color-card)] p-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="mb-4 h-3 w-24 rounded skeleton" />
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="h-11 rounded-[0.9rem] skeleton" />
              ))}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-5 flex gap-2 overflow-hidden lg:hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-10 w-32 shrink-0 rounded-full skeleton" />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductTileSkeleton key={index} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
