import Link from "next/link";
import { requireClientPortal } from "@/domain/client-portal/session";
import { prisma } from "@/lib/prisma";

export default async function ClientPortalDashboard(){
  const{context,portal}=await requireClientPortal();
  const[requests,quotes,orders,returns,tickets]=await Promise.all([
    prisma.quotationRequest.count({where:{userId:context.user.id,status:{notIn:["CANCELLED","CLOSED"]}}}),
    prisma.quotation.count({where:{customerId:context.user.id,status:{in:["DRAFT","PENDING_APPROVAL","FINAL_APPROVED","SENT","ISSUED"]}}}),
    prisma.order.count({where:{userId:context.user.id,status:{notIn:["DELIVERED","CANCELLED","REFUNDED"]}}}),
    prisma.returnCase.count({where:{customerId:context.user.id,status:{notIn:["CLOSED","REJECTED"]}}}),
    prisma.helpDeskTicket.count({where:{customerId:context.user.id,status:{notIn:["RESOLVED","CLOSED"]}}}),
  ]);
  const cards=[["Open requests",requests,"/account/quotations"],["Quotations",quotes,"/account/quotations"],["Current orders",orders,"/account/orders"],["Returns",returns,"/account/returns"],["Support requests",tickets,"/account/support"],["Documents","Available","/account"]];
  return <div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">{portal.tier} service</p><h1 className="mt-2 text-3xl font-semibold">Welcome, {context.user.name??"Client"}</h1><p className="mt-2 max-w-3xl text-slate-600">A dedicated view of your organisation’s work with Innozanzi, with direct access to quotations, fulfilment and support.</p><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label,value,href])=><Link className="border border-slate-300 bg-white p-5 shadow-sm hover:border-sky-500" href={String(href)} key={String(label)}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-4 text-sm font-semibold text-sky-700">Open workspace →</p></Link>)}</div><section className="mt-7 border border-slate-300 bg-white p-5"><h2 className="text-lg font-semibold">Quick actions</h2><div className="mt-4 flex flex-wrap gap-3"><Link className="bg-sky-700 px-4 py-2 text-sm font-semibold text-white" href="/quotations/request">Request a quotation</Link><Link className="border border-slate-400 px-4 py-2 text-sm font-semibold" href="/account/support">Contact support</Link><Link className="border border-slate-400 px-4 py-2 text-sm font-semibold" href="/shop">Browse products</Link></div></section></div>;
}
