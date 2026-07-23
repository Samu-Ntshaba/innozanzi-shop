import Link from "next/link";
import { AdminPage, Panel, StatusBadge, secondaryButtonClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

type CalendarItem = { date: Date; type: string; title: string; detail: string; href: string; status: string };
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requirePermission("customers.manage");
  const rawMonth = (await searchParams).month;
  const base = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? new Date(`${rawMonth}-01T00:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const [tasks, tickets, quotations, invoices, rfqs, requests, reviews] = await Promise.all([
    prisma.serviceTask.findMany({ where: { dueAt: { gte: start, lt: end }, status: { notIn: ["COMPLETED","CANCELLED"] } }, include: { ticket: true } }),
    prisma.helpDeskTicket.findMany({ where: { dueAt: { gte: start, lt: end }, status: { notIn: ["RESOLVED","CLOSED"] } } }),
    prisma.quotation.findMany({ where: { validUntil: { gte: start, lt: end }, status: { notIn: ["PAYMENT_VERIFIED","CONVERTED","CANCELLED","EXPIRED","REJECTED"] } }, select: { id: true, quotationNumber: true, validUntil: true, status: true } }),
    prisma.invoice.findMany({ where: { dueAt: { gte: start, lt: end }, status: { notIn: ["PAID","VOID"] } } }),
    prisma.rfqOpportunity.findMany({ where: { closingAt: { gte: start, lt: end }, status: { notIn: ["LOST","CANCELLED","EXPIRED","COMPLETED"] } }, select: { id: true, referenceNumber: true, title: true, closingAt: true, status: true } }),
    prisma.partnerRequest.findMany({ where: { requiredDate: { gte: start, lt: end }, status: { notIn: ["FULFILLED","CANCELLED","CLOSED"] } }, select: { id: true, requestNumber: true, title: true, requiredDate: true, status: true } }),
    prisma.partnershipReview.findMany({ where: { dueAt: { gte: start, lt: end }, completedAt: null }, include: { partnership: { select: { id: true, partnerNumber: true } } } }),
  ]);
  const items: CalendarItem[] = [
    ...tasks.map(x=>({date:x.dueAt!,type:"Task",title:x.title,detail:x.ticket?.ticketNumber??"General service task",href:x.ticketId?`/admin/help-desk/${x.ticketId}`:"/admin/help-desk",status:x.status})),
    ...tickets.map(x=>({date:x.dueAt!,type:"Ticket",title:x.subject,detail:x.ticketNumber,href:`/admin/help-desk/${x.id}`,status:x.status})),
    ...quotations.map(x=>({date:x.validUntil,type:"Quotation",title:`${x.quotationNumber} expires`,detail:"Customer decision/payment deadline",href:`/admin/quotations/${x.id}`,status:x.status})),
    ...invoices.map(x=>({date:x.dueAt,type:"Invoice",title:`${x.invoiceNumber} due`,detail:x.customerName,href:"/admin/invoices",status:x.status})),
    ...rfqs.map(x=>({date:x.closingAt!,type:"RFQ",title:x.title,detail:`${x.referenceNumber} closes`,href:`/admin/rfqs/${x.id}`,status:x.status})),
    ...requests.map(x=>({date:x.requiredDate!,type:"Partner request",title:x.title,detail:x.requestNumber,href:`/admin/partnerships/requests/${x.id}`,status:x.status})),
    ...reviews.map(x=>({date:x.dueAt,type:"Partner review",title:`Review ${x.partnership.partnerNumber}`,detail:x.reviewType.replaceAll("_"," "),href:`/admin/partnerships/partners/${x.partnership.id}`,status:"PENDING"})),
  ].sort((a,b)=>a.date.getTime()-b.date.getTime());
  const byDay = new Map<string, CalendarItem[]>();
  items.forEach(item=>byDay.set(dayKey(item.date),[...(byDay.get(dayKey(item.date))??[]),item]));
  const offset = (start.getDay()+6)%7;
  const days = new Date(base.getFullYear(),base.getMonth()+1,0).getDate();
  const previous = new Date(base.getFullYear(),base.getMonth()-1,1).toISOString().slice(0,7);
  const next = new Date(base.getFullYear(),base.getMonth()+1,1).toISOString().slice(0,7);
  return <AdminPage title="Operations calendar" description="One view of service deadlines, RFQ closings, quotation expiry, invoices and partnership commitments." actions={<div className="flex gap-2"><Link className={secondaryButtonClass} href={`?month=${previous}`}>Previous</Link><Link className={secondaryButtonClass} href={`?month=${next}`}>Next</Link></div>}>
    <Panel title={start.toLocaleDateString("en-ZA",{month:"long",year:"numeric"})} description={`${items.length} scheduled operational item${items.length===1?"":"s"} this month.`}>
      <div className="grid grid-cols-7 border-l border-t border-slate-200 text-center text-[10px] font-bold uppercase text-slate-500">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=><div className="border-b border-r p-2" key={x}>{x}</div>)}</div>
      <div className="grid grid-cols-7 border-l border-slate-200">{Array.from({length:offset},(_,i)=><div className="min-h-24 border-b border-r bg-slate-50" key={`empty-${i}`}/>)}{Array.from({length:days},(_,i)=>{const date=new Date(base.getFullYear(),base.getMonth(),i+1);const dayItems=byDay.get(dayKey(date))??[];return <div className="min-h-24 border-b border-r p-1.5" key={i}><span className="text-xs font-semibold">{i+1}</span><div className="mt-1 space-y-1">{dayItems.slice(0,3).map((item,index)=><Link className="block truncate rounded-sm bg-sky-50 px-1.5 py-1 text-[10px] font-semibold text-sky-900 hover:bg-sky-100" href={item.href} title={`${item.type}: ${item.title}`} key={`${item.type}-${index}`}>{item.type}: {item.title}</Link>)}{dayItems.length>3?<span className="text-[10px] text-slate-500">+{dayItems.length-3} more</span>:null}</div></div>})}</div>
    </Panel>
    <Panel title="Monthly agenda"><div className="divide-y divide-slate-200">{items.map((item,index)=><Link className="grid gap-2 py-3 hover:bg-sky-50 sm:grid-cols-[120px_130px_1fr_auto] sm:items-center sm:px-2" href={item.href} key={`${item.type}-${index}`}><span className="text-sm font-semibold">{item.date.toLocaleDateString("en-ZA",{day:"2-digit",month:"short"})}</span><span className="text-xs font-bold uppercase text-slate-500">{item.type}</span><span><strong className="text-sm">{item.title}</strong><span className="block text-xs text-slate-500">{item.detail}</span></span><StatusBadge value={item.status}/></Link>)}{!items.length?<p className="py-10 text-center text-sm text-slate-500">Nothing is due this month.</p>:null}</div></Panel>
  </AdminPage>;
}
