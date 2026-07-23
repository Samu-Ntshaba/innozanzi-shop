"use client";

import { buttonClass, secondaryButtonClass } from "@/components/admin/admin-ui";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className="border border-rose-200 bg-white p-6 shadow-sm" role="alert">
      <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Admin page unavailable</p>
      <h1 className="mt-2 text-xl font-semibold text-slate-950">We could not load this workspace</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">The request may have been interrupted. Retry once; if the problem continues, return to the operations dashboard and contact support.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={buttonClass} onClick={reset}>Try again</button>
        <a className={secondaryButtonClass} href="/admin">Return to dashboard</a>
      </div>
    </section>
  );
}
