export default function StoreLoading() {
  return <main aria-busy="true" aria-label="Loading page" className="mx-auto min-h-[60vh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <span className="sr-only">Loading…</span>
    <div className="h-4 w-32 animate-pulse rounded bg-slate-200"/>
    <div className="mt-3 h-9 w-64 max-w-full animate-pulse rounded bg-slate-200"/>
    <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {[0,1,2,3].map(item=><div key={item} className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="aspect-[4/3] animate-pulse bg-slate-100"/><div className="space-y-3 p-3"><div className="h-3 w-20 animate-pulse rounded bg-slate-200"/><div className="h-4 w-full animate-pulse rounded bg-slate-200"/><div className="h-6 w-24 animate-pulse rounded bg-slate-200"/></div></div>)}
    </div>
  </main>;
}
