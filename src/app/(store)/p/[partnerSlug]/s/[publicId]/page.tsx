import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveShowcase } from "@/domain/partner-sales/showcases";

export const dynamic = "force-dynamic";

export default async function PublicPartnerShowcasePage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerSlug: string; publicId: string }>;
  searchParams: Promise<{ accessToken?: string; submitted?: string; status?: string }>;
}) {
  const { partnerSlug, publicId } = await params;
  const query = await searchParams;
  const showcase = await resolveShowcase(publicId, query.accessToken);
  if (!showcase || showcase.profile.publicSlug !== partnerSlug) notFound();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-semibold text-sky-700 underline" href={`/p/${encodeURIComponent(partnerSlug)}`}>Back to {showcase.profile.displayName}</Link>
        {query.submitted === "1" ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900" role="status">Thanks — your quotation enquiry was received. The partner team will be in touch.</div> : null}
        {query.status === "error" ? <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900" role="alert">We could not submit that enquiry. Please check the fields and try again.</div> : null}
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[.18em] text-sky-700">{showcase.profile.displayName}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">{showcase.title}</h1>
          {showcase.introduction ? <p className="mt-4 max-w-3xl whitespace-pre-wrap text-base leading-7 text-slate-600">{showcase.introduction}</p> : null}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {showcase.items.map((item) => <article className="rounded-xl border border-slate-200 p-5" key={item.id}><h2 className="text-lg font-black text-slate-950">{item.title}</h2>{item.presentationCopy ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.presentationCopy}</p> : null}</article>)}
          </div>
          <div className="mt-10 rounded-xl bg-slate-50 p-5"><h2 className="text-xl font-black text-slate-950">Request a quotation</h2><p className="mt-2 text-sm leading-6 text-slate-600">Tell the partner team what your organisation needs. Innozanzi approves the final quotation and collects payment.</p><form className="mt-5 grid gap-4 sm:grid-cols-2" method="post" action="/api/partner-sales/enquiries"><input type="hidden" name="partnerSlug" value={partnerSlug} /><input type="hidden" name="publicId" value={publicId} /><input type="hidden" name="accessToken" value={query.accessToken ?? ""} /><input type="hidden" name="items" value={JSON.stringify(showcase.items.map((item) => ({ itemId: item.id, quantity: 1 })))} /><label className="grid gap-1 text-sm font-bold">Company<input className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" name="companyName" required maxLength={160} /></label><label className="grid gap-1 text-sm font-bold">Contact name<input className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" name="contactName" required maxLength={120} /></label><label className="grid gap-1 text-sm font-bold">Email<input className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" name="email" type="email" required maxLength={254} /></label><label className="grid gap-1 text-sm font-bold">Phone<input className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" name="phone" maxLength={40} /></label><label className="grid gap-1 text-sm font-bold sm:col-span-2">Delivery destination<input className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" name="destination" required maxLength={500} /></label><label className="grid gap-1 text-sm font-bold sm:col-span-2">Timing<input className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" name="timing" required maxLength={120} /></label><label className="grid gap-1 text-sm font-bold sm:col-span-2">Delivery instructions<textarea className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 font-normal" name="deliveryInstructions" maxLength={2000} /></label><label className="flex gap-3 text-sm sm:col-span-2"><input className="mt-1" type="checkbox" name="consent" required />I consent to Innozanzi and the partner team using these details to respond to this quotation request.</label><button className="min-h-11 rounded-xl bg-sky-700 px-5 text-sm font-black text-white hover:bg-sky-800 sm:col-span-2" type="submit">Request quotation</button></form></div>
        </section>
        <p className="mt-5 text-sm leading-6 text-slate-600">Innozanzi is the merchant of record. Quotations, tax documents, payment collection, fulfilment, and order communication are managed by Innozanzi.</p>
      </div>
    </main>
  );
}
