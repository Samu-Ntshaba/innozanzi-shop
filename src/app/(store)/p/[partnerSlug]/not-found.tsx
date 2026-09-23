import Link from "next/link";

export default function PartnerCatalogueNotFound() {
  return (
    <main className="bg-slate-50 px-4 py-20 sm:px-6">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <p className="text-xs font-black uppercase tracking-[.18em] text-sky-700">
          Partner catalogue unavailable
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          This sales channel is not currently published
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          The link may have changed, the catalogue may be under review, or this partner channel may no longer be active.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link className="rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white" href="/shop">
            Browse Innozanzi
          </Link>
          <Link className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800" href="/contact">
            Contact support
          </Link>
        </div>
      </section>
    </main>
  );
}
