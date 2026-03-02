export default function ShopLoading() {
  return (
    <main className="app-container py-10">
      <div className="flex items-end justify-between">
        <div>
          <div className="h-8 w-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="mt-2 h-5 w-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-11 w-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="card-base space-y-3">
            <div className="h-6 w-20 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-11 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-11 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-11 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-11 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-11 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-11 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </aside>

        <section>
          <div className="card-base h-16" />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <div className="aspect-[4/5] bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded-xl bg-slate-200 dark:bg-slate-800" />
                  <div className="h-5 w-1/2 rounded-xl bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
