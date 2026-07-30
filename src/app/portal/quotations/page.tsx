import Link from "next/link";
import { requireClientPortal } from "@/domain/client-portal/session";
import { prisma } from "@/lib/prisma";

const money=(value:unknown)=>`R ${Number(value).toLocaleString("en-ZA",{minimumFractionDigits:2})}`;
export default async function PortalQuotationsPage({searchParams}:{searchParams:Promise<{submitted?:string}>}){
  const{context}=await requireClientPortal();const{submitted}=await searchParams;
  const[requests,quotes]=await Promise.all([
    prisma.quotationRequest.findMany({where:{userId:context.user.id},include:{items:true,quotations:{select:{id:true,quotationNumber:true,status:true,grandTotal:true}}},orderBy:{createdAt:"desc"}}),
    prisma.quotation.findMany({where:{customerId:context.user.id},orderBy:{createdAt:"desc"}}),
  ]);
  return <div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Procurement</p><h1 className="mt-1 text-3xl font-semibold">Requests and quotations</h1><p className="mt-2 text-sm text-slate-600">Track everything from initial sourcing request through to the formal quotation.</p></div><Link className="rounded-md bg-sky-700 px-4 py-3 text-sm font-bold text-white" href="/portal/requests/new">New request</Link></div>
    {submitted?<div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Request {submitted} was submitted successfully. Our team will review it.</div>:null}
    <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm"><h2 className="border-b border-slate-200 px-5 py-4 text-lg font-semibold">Sourcing requests</h2><div className="divide-y divide-slate-100">{requests.map(item=><div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto]" key={item.id}><div><p className="font-semibold">{item.requestNumber}</p><p className="mt-1 text-sm text-slate-500">{item.items.map(line=>`${line.requestedQuantity}× ${line.productName??"Catalogue item"}`).join(", ")}</p></div><span className="self-center rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">{item.status.replaceAll("_"," ")}</span><span className="self-center text-xs text-slate-500">{item.createdAt.toLocaleDateString("en-ZA")}</span></div>)}{!requests.length?<p className="p-8 text-center text-sm text-slate-500">No requests submitted yet.</p>:null}</div></section>
    <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm"><h2 className="border-b border-slate-200 px-5 py-4 text-lg font-semibold">Formal quotations</h2><div className="divide-y divide-slate-100">{quotes.map(quote=><div className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto]" key={quote.id}><div><p className="font-semibold">{quote.quotationNumber}</p><p className="text-xs text-slate-500">Issued {quote.createdAt.toLocaleDateString("en-ZA")}</p></div><span className="self-center rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">{quote.status.replaceAll("_"," ")}</span><strong className="self-center">{money(quote.grandTotal)}</strong></div>)}{!quotes.length?<p className="p-8 text-center text-sm text-slate-500">Formal quotations will appear here after review.</p>:null}</div></section>
  </div>;
}
