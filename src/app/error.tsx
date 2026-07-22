"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="grid min-h-[65vh] place-items-center px-4 py-16"><section className="max-w-lg rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm"><p className="text-sm font-bold uppercase tracking-wider text-red-700">Request failed</p><h1 className="mt-2 text-3xl font-black text-slate-950">Something went wrong</h1><p className="mt-3 text-slate-600">We could not complete that request. Your changes may not have been saved. Please try again.</p>{error.digest?<p className="mt-3 text-xs text-slate-400">Reference: {error.digest}</p>:null}<button className="mt-6 min-h-12 rounded-lg bg-sky-600 px-6 font-bold text-white hover:bg-sky-700" onClick={reset}>Try again</button></section></main>;
}
