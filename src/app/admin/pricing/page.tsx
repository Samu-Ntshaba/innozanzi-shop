import { summarizeSavedEconomics } from "@/domain/commerce/report";
import { formatZar } from "@/lib/money";
import { requirePermission } from "@/domain/auth/session";
import { getCommerceSettings } from "@/domain/commerce/settings";
import { getPricingDraft } from "@/domain/commerce/draft";
import { PricingEditor } from "@/components/admin/pricing-editor";
import { AdminPage, MetricCard, Panel, StatusBadge } from "@/components/admin/admin-ui";
import { prisma } from "@/lib/prisma";

type ActivePointer={version?:unknown;publishedAt?:unknown;approvedBy?:unknown};

export default async function Page(){
  await requirePermission("settings.manage");
  const [settings,draft,history,orders,activeRow]=await Promise.all([
    getCommerceSettings(),getPricingDraft(),
    prisma.auditLog.findMany({where:{action:"commerce.pricing.update"},orderBy:{createdAt:"desc"},take:10,select:{id:true,createdAt:true,actorId:true,actor:{select:{name:true,email:true}},metadata:true}}),
    prisma.order.findMany({orderBy:{createdAt:"desc"},take:15,select:{id:true,orderNumber:true,paymentStatus:true,items:{select:{quantity:true,sourceSnapshot:true}}}}),
    prisma.siteSetting.findUnique({where:{key:"commerce.pricing.active"}}),
  ]);
  const pointer=activeRow?.value&&typeof activeRow.value==="object"&&!Array.isArray(activeRow.value)?activeRow.value as ActivePointer:null;
  const activeVersion=typeof pointer?.version==="string"?pointer.version:null;
  const activeAudit=activeVersion?history.find(item=>item.id===activeVersion):null;
  const publishedAt=typeof pointer?.publishedAt==="string"?pointer.publishedAt:activeRow?.updatedAt.toISOString();
  const publishedBy=activeAudit?.actor?.name??activeAudit?.actor?.email??(typeof pointer?.approvedBy==="string"?pointer.approvedBy:null);

  return <AdminPage title="Pricing" description="Set, preview and publish the authoritative Innozanzi selling-price configuration." eyebrow="Pricing & Trading">
    <div className="grid gap-3 md:grid-cols-4"><MetricCard label="Current pricing" value={activeVersion?<StatusBadge value="ACTIVE"/>:<StatusBadge value="AWAITING_APPROVAL"/>} detail={activeVersion?`Version ${activeVersion}`:"No active pricing version"}/><MetricCard label="Draft" value={draft?<StatusBadge value="DRAFT"/>:"None"} detail={draft?`Saved ${new Date(draft.savedAt).toLocaleString("en-ZA")}`:"Save settings to begin"}/><MetricCard label="Published at" value={publishedAt?new Date(publishedAt).toLocaleDateString("en-ZA"):"—"} detail={publishedAt?new Date(publishedAt).toLocaleString("en-ZA"):"No publication"}/><MetricCard label="Published by" value={publishedBy??"—"} detail={activeVersion?"Active approval":"No active approval"}/></div>
    <Panel>{!activeVersion?<p className="mb-4 rounded border border-red-300 bg-red-50 p-4 font-semibold text-red-900">Pricing approval pending. Checkout remains blocked until the saved draft is previewed and legitimately published here.</p>:null}<PricingEditor initial={settings} initialDraft={draft}/></Panel>
    <Panel title="Published pricing history">{history.length?<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Version</th><th>Status</th><th>Published</th><th>Published by</th></tr></thead><tbody>{history.map(item=><tr className="border-t" key={item.id}><td className="py-3 font-mono text-xs">{item.id}</td><td><StatusBadge value={item.id===activeVersion?"ACTIVE":"SUPERSEDED"}/></td><td>{item.createdAt.toLocaleString("en-ZA")}</td><td>{item.actor?.name??item.actor?.email??item.actorId??"System"}</td></tr>)}</tbody></table></div>:<p className="text-sm text-slate-600">No pricing version has been published.</p>}</Panel>
    <Panel title="Recent order contribution estimates"><p className="mb-4 text-sm text-slate-600">Saved order economics remain immutable. Monthly platform expense assumption: {formatZar(settings.platformMonthly)}.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Order</th><th>Payment</th><th>Landed cost</th><th>Fees</th><th>Reserve</th><th>Contribution</th></tr></thead><tbody>{orders.map(order=>{const economics=summarizeSavedEconomics(order.items);return <tr key={order.id} className="border-t"><td className="py-3">{order.orderNumber}</td><td>{order.paymentStatus}</td>{economics?<><td>{formatZar(economics.landed)}</td><td>{formatZar(economics.fees)}</td><td>{formatZar(economics.reserve)}</td><td>{formatZar(economics.contribution)}</td></>:<td colSpan={4}>No complete economics snapshot</td>}</tr>})}</tbody></table></div></Panel>
  </AdminPage>;
}
