import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Row, Section, Stat, card } from "@/components/mobile-admin/ui";

export default async function MobileActivity() {
  const now = new Date();
  const activeSince = new Date(now.getTime() - 15 * 60_000);
  const sessions = await prisma.session.findMany({where:{lastSeenAt:{gte:activeSince},expires:{gt:now},user:{status:"ACTIVE",deletedAt:null}},orderBy:{lastSeenAt:"desc"},distinct:["userId"],select:{id:true,lastSeenAt:true,user:{select:{name:true,email:true,accountType:true}}}});
  return <><h1 className="text-3xl font-black text-[#071b33]">Activity</h1><p className="mt-1 text-sm text-slate-500">Registered users seen in the last 15 minutes.</p><div className="mt-5"><Stat label="Signed in now" value={sessions.length} tone="green"/></div><Section title="Active accounts"><div className={card}>{sessions.length?sessions.map(session=><Row key={session.id} href="/admin/customers" title={session.user.name??session.user.email} meta={`${session.user.accountType.replaceAll("_"," ")} · ${session.lastSeenAt.toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})}`} badge="ONLINE"/>):<p className="p-5 text-sm text-slate-500">No registered users active right now.</p>}</div></Section><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black text-[#071b33]">Website visitors</h2><p className="mt-2 text-sm leading-6 text-slate-600">Anonymous and aggregate traffic is measured by Google Analytics. It is kept separate from signed-in account activity.</p><Link href="/admin/marketing/analytics" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#0a6ed1] px-4 text-sm font-bold text-white">Open analytics</Link></div></>;
}
