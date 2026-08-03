import Link from "next/link";
import { AdminPage,Panel,StatusBadge,buttonClass,inputClass,secondaryButtonClass,tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { generateComboDraft,runComboAutomationNow,saveComboSettings } from "@/domain/combos/actions";
import { prisma } from "@/lib/prisma";

export default async function ComboCampaigns({searchParams}:{searchParams:Promise<{notice?:string;created?:string;changed?:string}>}){
  await requirePermission("combos.view");
  const {notice,created,changed}=await searchParams;
  const[campaigns,settings,events]=await Promise.all([
    prisma.comboCampaign.findMany({include:{_count:{select:{items:true,events:true,quotationSnapshots:true}}},orderBy:{updatedAt:"desc"},take:100}),
    prisma.comboCampaignSetting.upsert({where:{id:"default"},update:{},create:{id:"default"}}),
    prisma.comboCampaignEvent.groupBy({by:["type"],_count:true}),
  ]);
  return <AdminPage title="Product Combo Campaigns" description="Build profitable multi-product offers using the existing catalogue, quotation, email and homepage systems." actions={<div className="flex gap-2"><form action={runComboAutomationNow}><button className={secondaryButtonClass}>Run automation now</button></form><Link className={buttonClass} href="/admin/marketing/combos/new">Create combo</Link></div>}>
    {notice==="catalogue-not-ready"?<div role="alert" className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"><strong>Combo draft not generated.</strong> Add stock and a verified cost price to at least two published catalogue products, then try again.</div>:null}
    {notice==="automation-ran"?<div role="status" className="border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"><strong>Automation completed.</strong> Created {created??"0"} combo(s) and changed {changed??"0"} campaign status(es).</div>:null}
    <Panel title="AI-assisted recommendation" description="AI may choose only stocked catalogue products with verified costs. It always creates a protected draft."><form action={generateComboDraft} className="grid gap-3 md:grid-cols-[180px_1fr_auto]"><select className={inputClass} name="type"><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option></select><input className={inputClass} name="audience" defaultValue="Small businesses" required/><button className={buttonClass}>Generate draft</button></form></Panel>
    <div className="grid gap-3 sm:grid-cols-4">{[["Campaigns",campaigns.length],["Active",campaigns.filter(x=>x.status==="ACTIVE").length],["Quote requests",events.find(x=>x.type==="QUOTATION_REQUEST")?._count??0],["Minimum margin",`${Number(settings.minimumProfitMargin)}%`]].map(([label,value])=><Panel key={String(label)}><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></Panel>)}</div>
    <Panel title="Campaigns"><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Campaign</th><th>Type</th><th>Status</th><th>Products</th><th>Price / profit</th><th>Performance</th><th></th></tr></thead><tbody>{campaigns.map(x=><tr key={x.id}><td><strong>{x.name}</strong><small className="block">{x.startsAt.toLocaleDateString("en-ZA")}–{x.endsAt.toLocaleDateString("en-ZA")}</small></td><td>{x.type}</td><td><StatusBadge value={x.status}/></td><td>{x._count.items}</td><td>R {Number(x.comboPrice).toFixed(2)}<small className="block">{Number(x.profitMargin).toFixed(1)}% margin</small></td><td>{x._count.quotationSnapshots} quotes · {x._count.events} events</td><td><Link className={secondaryButtonClass} href={`/admin/marketing/combos/${x.id}`}>Manage</Link></td></tr>)}</tbody></table></div></Panel>
    <Panel title="Profit and automation controls" description="AI and staff publication must pass these shared limits."><form action={saveComboSettings} className="grid gap-3 md:grid-cols-3">
      <label>Minimum profit amount<input className={`${inputClass} mt-1 w-full`} name="minimumProfitAmount" type="number" min="0" step=".01" defaultValue={settings.minimumProfitAmount.toString()}/></label>
      <label>Minimum margin %<input className={`${inputClass} mt-1 w-full`} name="minimumProfitMargin" type="number" min="0" max="100" step=".01" defaultValue={settings.minimumProfitMargin.toString()}/></label>
      <label>Maximum discount %<input className={`${inputClass} mt-1 w-full`} name="maximumDiscountPercent" type="number" min="0" max="100" step=".01" defaultValue={settings.maximumDiscountPercent.toString()}/></label>
      <label>Maximum products<input className={`${inputClass} mt-1 w-full`} name="maximumProducts" type="number" min="2" max="10" defaultValue={settings.maximumProducts}/></label>
      <label>Maximum active combos<input className={`${inputClass} mt-1 w-full`} name="maximumActiveCampaigns" type="number" min="1" max="50" defaultValue={settings.maximumActiveCampaigns}/></label>
      <label>Target margin %<input className={`${inputClass} mt-1 w-full`} name="targetProfitMargin" type="number" min="0" max="100" step=".01" defaultValue={settings.targetProfitMargin.toString()}/></label>
      {[["dailyEnabled","Daily generation",settings.dailyEnabled],["weeklyEnabled","Weekly generation",settings.weeklyEnabled],["monthlyEnabled","Monthly generation",settings.monthlyEnabled],["automaticPublication","Automatic publication",settings.automaticPublication],["automaticEmail","Automatic email",settings.automaticEmail],["automaticSlider","Automatic slider",settings.automaticSlider]].map(([name,label,checked])=><label className="flex items-center gap-2" key={String(name)}><input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)}/>{label}</label>)}
      <button className={`${buttonClass} md:col-span-3`}>Save controls</button>
    </form></Panel>
  </AdminPage>;
}
