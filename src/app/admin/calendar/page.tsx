import Link from "next/link";
import { AdminPage, Panel, StatusBadge, secondaryButtonClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

type CalendarItem = { date: Date; type: string; title: string; detail: string; href: string; status: string };
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const typeTone:Record<string,string>={Task:"bg-violet-50 text-violet-900 border-violet-200",Ticket:"bg-rose-50 text-rose-900 border-rose-200",Quotation:"bg-amber-50 text-amber-900 border-amber-200",Invoice:"bg-emerald-50 text-emerald-900 border-emerald-200",RFQ:"bg-indigo-50 text-indigo-900 border-indigo-200","Partner request":"bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200","Partner review":"bg-purple-50 text-purple-900 border-purple-200",Delivery:"bg-sky-50 text-sky-900 border-sky-200"};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requirePermission("customers.manage");
  const rawMonth = (await searchParams).month;
  const base = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? new Date(`${rawMonth}-01T00:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const [tasks, tickets, quotations, invoices, rfqs, requests, reviews, deliveries] = await Promise.all([
    prisma.serviceTask.findMany({ where: { dueAt: { gte: start, lt: end }, status: { notIn: ["COMPLETED","CANCELLED"] } }, include: { ticket: true } }),
    prisma.helpDeskTicket.findMany({ where: { dueAt: { gte: start, lt: end }, status: { notIn: ["RESOLVED","CLOSED"] } } }),
    prisma.quotation.findMany({ where: { validUntil: { gte: start, lt: end }, status: { notIn: ["PAYMENT_VERIFIED","CONVERTED","CANCELLED","EXPIRED","REJECTED"] } }, select: { id: true, quotationNumber: true, validUntil: true, status: true } }),
    prisma.invoice.findMany({ where: { dueAt: { gte: start, lt: end }, status: { notIn: ["PAID","VOID"] } } }),
    prisma.rfqOpportunity.findMany({ where: { closingAt: { gte: start, lt: end }, status: { notIn: ["LOST","CANCELLED","EXPIRED","COMPLETED"] } }, select: { id: true, referenceNumber: true, title: true, closingAt: true, status: true } }),
    prisma.partnerRequest.findMany({ where: { requiredDate: { gte: start, lt: end }, status: { notIn: ["FULFILLED","CANCELLED","CLOSED"] } }, select: { id: true, requestNumber: true, title: true, requiredDate: true, status: true } }),
    prisma.partnershipReview.findMany({ where: { dueAt: { gte: start, lt: end }, completedAt: null }, include: { partnership: { select: { id: true, partnerNumber: true } } } }),
    prisma.shipment.findMany({ where: { estimatedDeliveryAt: { gte: start, lt: end }, order: { status: { notIn: ["DELIVERED","COMPLETED","CANCELLED"] } } }, include: { order: { select: { id: true, orderNumber: true, status: true } } } }),
  ]);
  const items: CalendarItem[] = [
    ...tasks.map(x=>({date:x.dueAt!,type:"Task",title:x.title,detail:x.ticket?.ticketNumber??"General service task",href:x.ticketId?`/admin/help-desk/${x.ticketId}`:"/admin/help-desk",status:x.status})),
    ...tickets.map(x=>({date:x.dueAt!,type:"Ticket",title:x.subject,detail:x.ticketNumber,href:`/admin/help-desk/${x.id}`,status:x.status})),
    ...quotations.map(x=>({date:x.validUntil,type:"Quotation",title:`${x.quotationNumber} expires`,detail:"Customer decision/payment deadline",href:`/admin/quotations/${x.id}`,status:x.status})),
    ...invoices.map(x=>({date:x.dueAt,type:"Invoice",title:`${x.invoiceNumber} due`,detail:x.customerName,href:"/admin/invoices",status:x.status})),
    ...rfqs.map(x=>({date:x.closingAt!,type:"RFQ",title:x.title,detail:`${x.referenceNumber} closes`,href:`/admin/rfqs/${x.id}`,status:x.status})),
    ...requests.map(x=>({date:x.requiredDate!,type:"Partner request",title:x.title,detail:x.requestNumber,href:`/admin/partnerships/requests/${x.id}`,status:x.status})),
    ...reviews.map(x=>({date:x.dueAt,type:"Partner review",title:`Review ${x.partnership.partnerNumber}`,detail:x.reviewType.replaceAll("_"," "),href:`/admin/partnerships/partners/${x.partnership.id}`,status:"PENDING"})),
    ...deliveries.map(x=>({date:x.estimatedDeliveryAt!,type:"Delivery",title:`${x.order.orderNumber} planned`,detail:x.deliveryCompany??"Delivery provider to be confirmed",href:`/admin/orders/${x.order.id}`,status:x.order.status})),
  ].sort((a,b)=>a.date.getTime()-b.date.getTime());
  const byDay = new Map<string, CalendarItem[]>();
  items.forEach(item=>byDay.set(dayKey(item.date),[...(byDay.get(dayKey(item.date))??[]),item]));
  const offset = (start.getDay()+6)%7;
  const days = new Date(base.getFullYear(),base.getMonth()+1,0).getDate();
  const previous = new Date(base.getFullYear(),base.getMonth()-1,1).toISOString().slice(0,7);
  const next = new Date(base.getFullYear(),base.getMonth()+1,1).toISOString().slice(0,7);
  const today=dayKey(new Date());
  const typeCounts=[...new Set(items.map(x=>x.type))].map(type=>({type,count:items.filter(x=>x.type===type).length}));
  return <AdminPage title="Operations calendar" description="One view of service deadlines, RFQ closings, quotation expiry, invoices and partnership commitments." actions={<div className="flex gap-2"><Link className={secondaryButtonClass} href={`?month=${previous}`}>Previous</Link><Link className={secondaryButtonClass} href={`?month=${next}`}>Next</Link></div>}>
    <div className="flex flex-wrap gap-2">{typeCounts.map(({type,count})=><span className={`rounded-full border px-3 py-1 text-xs font-bold ${typeTone[type]??"bg-slate-50 text-slate-700 border-slate-200"}`} key={type}>{type} · {count}</span>)}</div>
    <Panel title={start.toLocaleDateString("en-ZA",{month:"long",year:"numeric"})} description={`${items.length} scheduled operational item${items.length===1?"":"s"} this month.`}>
      <div className="grid grid-cols-7 border-l border-t border-slate-200 text-center text-[10px] font-bold uppercase text-slate-500">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=><div className="border-b border-r p-2" key={x}>{x}</div>)}</div>
      <div className="grid grid-cols-7 border-l border-slate-200">{Array.from({length:offset},(_,i)=><div className="min-h-28 border-b border-r bg-slate-50" key={`empty-${i}`}/>)}{Array.from({length:days},(_,i)=>{const date=new Date(base.getFullYear(),base.getMonth(),i+1);const key=dayKey(date);const dayItems=byDay.get(key)??[];return <div className={`min-h-28 border-b border-r p-1.5 ${key===today?"bg-sky-50 ring-2 ring-inset ring-sky-400":date.getDay()===0||date.getDay()===6?"bg-slate-50/70":"bg-white"}`} key={i}><span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${key===today?"bg-sky-700 text-white":""}`}>{i+1}</span><div className="mt-1 space-y-1">{dayItems.slice(0,3).map((item,index)=><Link className={`block truncate rounded-sm border px-1.5 py-1 text-[10px] font-semibold ${typeTone[item.type]??"bg-slate-50 text-slate-700 border-slate-200"}`} href={item.href} title={`${item.type}: ${item.title}`} key={`${item.type}-${index}`}>{item.type}: {item.title}</Link>)}{dayItems.length>3?<span className="text-[10px] font-semibold text-slate-500">+{dayItems.length-3} more in agenda</span>:null}</div></div>})}</div>
    </Panel>
    <Panel title="Monthly agenda"><div className="divide-y divide-slate-200">{items.map((item,index)=><Link className="grid gap-2 py-3 hover:bg-sky-50 sm:grid-cols-[120px_130px_1fr_auto] sm:items-center sm:px-2" href={item.href} key={`${item.type}-${index}`}><span className="text-sm font-semibold">{item.date.toLocaleDateString("en-ZA",{day:"2-digit",month:"short"})}</span><span className="text-xs font-bold uppercase text-slate-500">{item.type}</span><span><strong className="text-sm">{item.title}</strong><span className="block text-xs text-slate-500">{item.detail}</span></span><StatusBadge value={item.status}/></Link>)}{!items.length?<p className="py-10 text-center text-sm text-slate-500">Nothing is due this month.</p>:null}</div></Panel>
  </AdminPage>;
}
