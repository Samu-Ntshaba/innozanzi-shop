import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage,Panel,StatusBadge,buttonClass,inputClass,secondaryButtonClass,tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { publishComboChannels,setComboStatus } from "@/domain/combos/actions";
import { prisma } from "@/lib/prisma";

export default async function ComboDetail({params}:{params:Promise<{id:string}>}){
  await requirePermission("combos.view");const id=(await params).id;
  const campaign=await prisma.comboCampaign.findUnique({where:{id},include:{items:{include:{product:{include:{inventory:true}}}},events:{orderBy:{createdAt:"desc"},take:50},quotationSnapshots:true}});
  if(!campaign)notFound();
  const discount=Number(campaign.normalPrice)-Number(campaign.comboPrice);
  return <AdminPage title={campaign.name} description={campaign.headline} actions={<><Link className={secondaryButtonClass} href="/admin/marketing/combos">All combos</Link><Link className={secondaryButtonClass} href={`/combos/${campaign.slug}`} target="_blank">Public preview</Link></>}>
    <div className="grid gap-3 sm:grid-cols-5">{[["Status",<StatusBadge key="status" value={campaign.status}/>],["Normal",`R ${Number(campaign.normalPrice).toFixed(2)}`],["Combo",`R ${Number(campaign.comboPrice).toFixed(2)}`],["Saving",`R ${discount.toFixed(2)}`],["Gross margin",`${Number(campaign.profitMargin).toFixed(2)}%`]].map(([label,value])=><Panel key={String(label)}><p className="text-xs text-slate-500">{label}</p><div className="mt-1 text-lg font-bold">{value}</div></Panel>)}</div>
    {campaign.requiresApproval&&!campaign.approvedAt?<p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">This campaign requires approval because its pricing reached a configured warning threshold. Publication will revalidate all limits.</p>:null}
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]"><Panel title="Included products"><table className={tableClass}><thead><tr><th>Product</th><th>Qty</th><th>Available</th><th>Normal</th><th>Cost</th></tr></thead><tbody>{campaign.items.map(x=><tr key={x.id}><td>{x.productName}<small className="block">{x.sku}</small></td><td>{x.quantity}</td><td>{x.product.inventory.reduce((n,i)=>n+Math.max(0,i.onHand-i.reserved),0)}</td><td>R {Number(x.unitNormalPrice).toFixed(2)}</td><td>R {Number(x.unitCost).toFixed(2)}</td></tr>)}</tbody></table></Panel><div className="space-y-5">
      <Panel title="Lifecycle"><form action={setComboStatus} className="space-y-3"><input type="hidden" name="id" value={id}/><select className={`${inputClass} w-full`} name="status">{["SCHEDULED","ACTIVE","PAUSED","CANCELLED"].map(x=><option key={x}>{x}</option>)}</select><textarea className={`${inputClass} min-h-20 w-full`} name="reason" placeholder="Reason or approval note"/><button className={`${buttonClass} w-full`}>Apply status</button></form></Panel>
      <Panel title="Existing marketing channels" description="Creates a scheduled homepage block and a draft in the existing email marketing system."><form action={publishComboChannels}><input type="hidden" name="id" value={id}/><button className={`${secondaryButtonClass} w-full`}>Create/update slider and email</button></form>{campaign.emailCampaignId?<Link className="mt-3 block text-sm font-semibold text-sky-700 underline" href={`/admin/email-marketing?campaign=${campaign.emailCampaignId}`}>Open email campaign</Link>:null}</Panel>
    </div></div>
    <Panel title="Performance"><div className="grid gap-3 sm:grid-cols-4">{[["Page views",campaign.events.filter(x=>x.type==="VIEW").length],["Slider impressions",campaign.events.filter(x=>x.type==="SLIDER_IMPRESSION").length],["Quote requests",campaign.quotationSnapshots.length],["Tracked revenue",campaign.events.filter(x=>x.type==="ORDER").reduce((n,x)=>n+Number(x.value??0),0)]].map(([label,value])=><div className="rounded border p-3" key={String(label)}><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold">{value}</p></div>)}</div></Panel>
    <Panel title="Audit and event history"><div className="space-y-2">{campaign.events.map(x=><div className="border-l-2 border-sky-400 pl-3 text-sm" key={x.id}><strong>{x.type.replaceAll("_"," ")}</strong> · {x.createdAt.toLocaleString("en-ZA")}</div>)}</div></Panel>
  </AdminPage>;
}
