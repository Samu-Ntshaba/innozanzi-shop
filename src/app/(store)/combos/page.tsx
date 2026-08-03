import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";
export default async function ComboDeals(){
  const now=new Date();const campaigns=await prisma.comboCampaign.findMany({where:{status:"ACTIVE",startsAt:{lte:now},endsAt:{gt:now},isTestData:false},include:{items:true},orderBy:[{featured:"desc"},{endsAt:"asc"}]});
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Limited-time value</p><h1 className="mt-2 text-4xl font-black text-[#071b33]">Product Combo Deals</h1><p className="mt-3 max-w-2xl text-slate-600">Practical technology packages with live availability and protected business pricing.</p>
    {campaigns.length?<div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{campaigns.map(x=>{const saving=Number(x.normalPrice)>Number(x.comboPrice);return <Link className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg" href={`/combos/${x.slug}`} key={x.id}>{x.imageUrl?<div className="relative aspect-[16/9] bg-slate-100"><Image src={x.imageUrl} alt={x.headline} fill sizes="(max-width:768px) 100vw, 33vw" className="object-contain p-5"/></div>:null}<div className="p-5"><span className="text-xs font-bold text-sky-700">{x.type} COMBO</span><h2 className="mt-1 text-xl font-bold">{x.name}</h2><p className="mt-2 line-clamp-2 text-sm text-slate-600">{x.description}</p>{saving?<p className="mt-4 text-sm text-slate-500"><s>R {Number(x.normalPrice).toFixed(2)}</s></p>:<p className="mt-4 text-sm text-slate-500">Business bundle price</p>}<p className="text-2xl font-black text-sky-700">R {Number(x.comboPrice).toFixed(2)}</p><p className="mt-2 text-xs font-semibold text-amber-700">Ends {x.endsAt.toLocaleString("en-ZA")}</p></div></Link>})}</div>:<div className="mt-8 rounded-xl border border-dashed p-10 text-center text-slate-600">No combo deals are active right now. Check again soon or request a tailored quotation.</div>}
  </main>;
}
