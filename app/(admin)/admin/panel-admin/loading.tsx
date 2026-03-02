export default function AdminPanelLoading() {
  return (
    <section className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </section>
  );
}
