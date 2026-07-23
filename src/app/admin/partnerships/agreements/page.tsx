import Link from "next/link";
import { AdminPage, Panel, StatusBadge, tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export default async function PartnershipAgreements(){
  await requirePermission("partnership.view");
  const partners=await prisma.partnership.findMany({include:{owner:true,partnershipType:true,agreement:true},orderBy:{createdAt:"desc"},take:200});
  return <AdminPage title="Partnership agreements" description="Drafting, signatures, renewals, amendments and offline signed agreements use one controlled lifecycle."><Panel className="p-0"><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Partner</th><th>Programme</th><th>Agreement</th><th>Version</th><th>Expiry</th><th>Action</th></tr></thead><tbody>{partners.map(row=><tr key={row.id}><td><strong>{row.partnerNumber}</strong><small className="block">{row.owner.name??row.owner.email}</small></td><td>{row.partnershipType.name}</td><td>{row.agreement?<StatusBadge value={row.agreement.status}/>:<span className="text-slate-500">Not created</span>}</td><td>{row.agreement?.currentVersion??"—"}</td><td>{row.agreement?.expiresAt?.toLocaleDateString("en-ZA")??"—"}</td><td><Link className="font-bold text-sky-700" href={`/admin/partnerships/partners/${row.id}/agreement`}>{row.agreement?"Manage":"Create"}</Link></td></tr>)}</tbody></table></div></Panel></AdminPage>;
}
