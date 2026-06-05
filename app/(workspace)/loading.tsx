function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-container-high/70 ${className}`} />;
}

function SkeletonPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass-panel rounded-xl p-5 ${className}`}>
      {children}
    </section>
  );
}

export default function WorkspaceLoading() {
  return (
    <div className="mx-auto max-w-container">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-5 w-72 max-w-full" />
        </div>
        <SkeletonBlock className="h-11 w-40" />
      </header>

      <div className="mb-8 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_230px_auto]">
        <SkeletonBlock className="h-12" />
        <SkeletonBlock className="h-12" />
        <SkeletonBlock className="h-12 w-full lg:w-44" />
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {[0, 1, 2].map((item) => (
            <SkeletonPanel key={item}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <SkeletonBlock className="h-6 w-44" />
                  <SkeletonBlock className="h-4 w-64 max-w-full" />
                </div>
                <SkeletonBlock className="h-9 w-28" />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <SkeletonBlock className="h-8 w-28" />
                <SkeletonBlock className="h-8 w-32" />
                <SkeletonBlock className="h-8 w-24" />
              </div>
            </SkeletonPanel>
          ))}
        </div>

        <SkeletonPanel className="space-y-4">
          <SkeletonBlock className="h-7 w-48" />
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-lg border border-secondary/10 bg-surface-container-lowest p-4">
              <SkeletonBlock className="h-5 w-36" />
              <SkeletonBlock className="mt-3 h-4 w-48 max-w-full" />
              <div className="mt-4 flex gap-2">
                <SkeletonBlock className="h-7 w-20" />
                <SkeletonBlock className="h-7 w-24" />
              </div>
            </div>
          ))}
        </SkeletonPanel>
      </div>
    </div>
  );
}
