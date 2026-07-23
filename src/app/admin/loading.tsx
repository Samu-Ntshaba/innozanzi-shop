export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading admin page" className="animate-pulse space-y-4">
      <div className="border-b border-slate-300 pb-4">
        <div className="h-3 w-40 bg-slate-300" />
        <div className="mt-3 h-7 w-72 max-w-full bg-slate-300" />
        <div className="mt-2 h-4 w-[32rem] max-w-full bg-slate-200" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div className="h-24 border border-slate-300 bg-white" key={item} />)}
      </div>
      <div className="h-72 border border-slate-300 bg-white" />
    </div>
  );
}
