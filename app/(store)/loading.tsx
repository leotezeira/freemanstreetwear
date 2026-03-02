export default function StoreLoading() {
  return (
    <main className="app-container py-10">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-center">
        <div className="space-y-3">
          <div className="h-4 w-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-3/4 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-5 w-2/3 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="flex gap-2">
            <div className="h-12 w-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-12 w-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="h-64 w-full rounded-3xl bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="mt-10">
        <div className="h-7 w-56 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <div className="aspect-[4/5] bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-1/2 rounded-xl bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
