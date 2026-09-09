export default function AccountLoading() {
  return <main aria-busy="true" aria-label="Loading account" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
    <span className="sr-only">Loading your account…</span>
    <div className="h-8 w-56 max-w-full animate-pulse rounded bg-slate-200"/>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[0,1,2].map(item=><div key={item} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white"/>)}
    </div>
    <div className="mt-6 h-64 animate-pulse rounded-xl border border-slate-200 bg-white"/>
  </main>;
}
