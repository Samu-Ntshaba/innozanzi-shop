import { notFound } from "next/navigation";
import Link from "next/link";
import { replyToHelpDeskTicket } from "@/domain/communications/actions";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { whatsappUrl } from "@/lib/support";

export default async function SupportTicketPage({params}:{params:Promise<{id:string}>}) {
  const {user}=await requireUser();
  const ticket=await prisma.helpDeskTicket.findFirst({where:{id:(await params).id,OR:[{customerId:user.id},{customerId:null,email:{equals:user.email,mode:"insensitive"}}]},include:{department:true,activities:{where:{isInternal:false},orderBy:{createdAt:"asc"}}}});
  if(!ticket)notFound();
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
    <Link className="text-sm font-semibold text-sky-700" href="/account/support">← Support tickets</Link>
    <div className="mt-5 rounded-2xl bg-[#071b33] p-6 text-white"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-300">{ticket.ticketNumber}</p><h1 className="mt-2 text-2xl font-black">{ticket.subject}</h1></div><span className="h-fit rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">{ticket.status.replaceAll("_"," ")}</span></div><p className="mt-4 text-sm text-slate-300">Opened {ticket.createdAt.toLocaleString("en-ZA")} · {ticket.category} · {ticket.department?.name??"Customer Care"}</p></div>
    <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">Conversation</h2><div className="mt-4 space-y-4"><article className="rounded-xl bg-slate-100 p-4"><p className="whitespace-pre-wrap text-sm">{ticket.message}</p><p className="mt-2 text-xs text-slate-500">You · {ticket.createdAt.toLocaleString("en-ZA")}</p></article>{ticket.activities.filter(a=>a.type!=="CUSTOMER_MESSAGE"&&a.type!=="TICKET_CAPTURED").map(activity=><article className={`rounded-xl border p-4 ${activity.type==="CUSTOMER_REPLY"?"ml-8 border-slate-200 bg-slate-50":"mr-8 border-sky-200 bg-sky-50"}`} key={activity.id}><p className="whitespace-pre-wrap text-sm">{activity.message}</p><p className="mt-2 text-xs text-slate-500">{activity.type==="CUSTOMER_REPLY"?"You":"Innozanzi support"} · {activity.createdAt.toLocaleString("en-ZA")}</p></article>)}</div></section>
    {ticket.status!=="CLOSED"?<form action={replyToHelpDeskTicket} className="mt-5 rounded-2xl border bg-white p-5"><input name="id" type="hidden" value={ticket.id}/><label className="text-sm font-bold">Reply to this ticket<textarea className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 p-3 text-sm" name="message" placeholder="Add information or answer our support team…" required/></label><button className="mt-3 rounded-lg bg-sky-700 px-5 py-3 text-sm font-bold text-white">Send reply</button></form>:null}
    <div className="mt-5 flex flex-wrap gap-3"><a className="rounded-lg bg-[#159447] px-4 py-3 font-bold text-white" href={whatsappUrl(`Hello Innozanzi, I am following up on support ticket ${ticket.ticketNumber}.`)} target="_blank" rel="noreferrer">Follow up on WhatsApp</a><Link className="rounded-lg border px-4 py-3 font-bold" href="/contact">Start another conversation</Link></div>
  </main>;
}
