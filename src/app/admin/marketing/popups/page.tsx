import { AdminPage,buttonClass,inputClass,Panel,StatusBadge,tableClass } from "@/components/admin/admin-ui";
import { archiveMarketingPopup,saveMarketingPopup } from "@/domain/marketing/actions";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

type PopupContent={heading?:string;body?:string;buttonLabel?:string|null;buttonLink?:string|null;audience?:string;pathMode?:string;paths?:string[];frequency?:string;tone?:string};

export default async function MarketingPopupsPage(){
  await requirePermission("marketing.content.view");
  const rows=await prisma.marketingBlock.findMany({where:{location:"POPUP",type:"POPUP",isTestData:false},include:{_count:{select:{versions:true}}},orderBy:[{displayOrder:"asc"},{updatedAt:"desc"}]});
  return <AdminPage title="Website popups" description="Create focused storefront notices with audience, page, frequency and date controls. Published popups replace the default catalogue-readiness notice.">
    <Panel title="Create popup" description="Keep one clear message and one optional action. Visitors can always dismiss the popup."><PopupForm/></Panel>
    <Panel className="p-0" title="Configured popups">
      <div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Popup</th><th>Targeting</th><th>Frequency</th><th>Schedule</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {rows.map(row=>{const content=row.content as PopupContent;return <tr key={row.id}><td><strong>{row.title??row.key}</strong><br/><span className="text-xs text-slate-500">{content.heading}</span></td><td className="text-xs">{content.audience??"ALL"} · {content.pathMode??"ALL"}</td><td className="text-xs">{(content.frequency??"ONCE_SESSION").replaceAll("_"," ")}</td><td className="text-xs">{row.startsAt?.toLocaleString("en-ZA")??"Immediately"}<br/>{row.endsAt?`until ${row.endsAt.toLocaleString("en-ZA")}`:"No end date"}</td><td><StatusBadge value={row.status}/><br/><span className="text-xs text-slate-500">{row._count.versions} version(s)</span></td><td><details><summary className="cursor-pointer font-semibold text-sky-700">Edit</summary><div className="mt-3 min-w-[min(44rem,80vw)] border border-slate-200 bg-white p-4"><PopupForm row={row}/>{row.status!=="ARCHIVED"?<form action={archiveMarketingPopup} className="mt-3"><input name="id" type="hidden" value={row.id}/><button className="text-sm font-bold text-red-700">Archive popup</button></form>:null}</div></details></td></tr>})}
        {!rows.length?<tr><td className="py-10 text-center text-slate-500" colSpan={6}>No custom popups yet. The supplier-readiness notice is currently used.</td></tr>:null}
      </tbody></table></div>
    </Panel>
  </AdminPage>;
}

function PopupForm({row}:{row?:{id:string;key:string;title:string|null;content:unknown;status:string;displayOrder:number;startsAt:Date|null;endsAt:Date|null}}){
  const content=(row?.content??{}) as PopupContent;
  return <form action={saveMarketingPopup} className="grid gap-3 md:grid-cols-2">
    <input name="id" type="hidden" value={row?.id??""}/>
    <label className="text-sm font-semibold">Internal key<input className={`${inputClass} mt-1 w-full`} defaultValue={row?.key} name="key" placeholder="supplier-readiness" required/></label>
    <label className="text-sm font-semibold">Internal title<input className={`${inputClass} mt-1 w-full`} defaultValue={row?.title??""} name="title" placeholder="Catalogue readiness notice"/></label>
    <label className="text-sm font-semibold md:col-span-2">Public heading<input className={`${inputClass} mt-1 w-full`} defaultValue={content.heading} name="heading" required/></label>
    <label className="text-sm font-semibold md:col-span-2">Message<textarea className={`${inputClass} mt-1 min-h-28 w-full`} defaultValue={content.body} name="body" required/></label>
    <label className="text-sm font-semibold">Button label<input className={`${inputClass} mt-1 w-full`} defaultValue={content.buttonLabel??""} name="buttonLabel" placeholder="Explore the catalogue"/></label>
    <label className="text-sm font-semibold">Button destination<input className={`${inputClass} mt-1 w-full`} defaultValue={content.buttonLink??""} name="buttonLink" placeholder="/shop"/></label>
    <label className="text-sm font-semibold">Audience<select className={`${inputClass} mt-1 w-full`} defaultValue={content.audience??"ALL"} name="audience"><option value="ALL">Everyone</option><option value="GUEST">Signed-out visitors</option><option value="AUTHENTICATED">Signed-in clients</option></select></label>
    <label className="text-sm font-semibold">Page rule<select className={`${inputClass} mt-1 w-full`} defaultValue={content.pathMode??"ALL"} name="pathMode"><option value="ALL">All storefront pages</option><option value="INCLUDE">Only listed pages</option><option value="EXCLUDE">All except listed pages</option></select></label>
    <label className="text-sm font-semibold md:col-span-2">Public paths <span className="font-normal text-slate-500">(one per line; for example /shop)</span><textarea className={`${inputClass} mt-1 min-h-20 w-full font-mono text-xs`} defaultValue={content.paths?.join("\n")} name="paths"/></label>
    <label className="text-sm font-semibold">Display frequency<select className={`${inputClass} mt-1 w-full`} defaultValue={content.frequency??"ONCE_SESSION"} name="frequency"><option value="ONCE_SESSION">Once per browser session</option><option value="ONCE_7_DAYS">Once every 7 days</option><option value="EVERY_VISIT">Every page visit until dismissed</option></select></label>
    <label className="text-sm font-semibold">Style<select className={`${inputClass} mt-1 w-full`} defaultValue={content.tone??"INFO"} name="tone"><option value="INFO">Information</option><option value="NOTICE">Important notice</option><option value="SUCCESS">Positive update</option></select></label>
    <label className="text-sm font-semibold">Starts<input className={`${inputClass} mt-1 w-full`} defaultValue={row?.startsAt?.toISOString().slice(0,16)} name="startsAt" type="datetime-local"/></label>
    <label className="text-sm font-semibold">Ends<input className={`${inputClass} mt-1 w-full`} defaultValue={row?.endsAt?.toISOString().slice(0,16)} name="endsAt" type="datetime-local"/></label>
    <label className="text-sm font-semibold">Priority<input className={`${inputClass} mt-1 w-full`} defaultValue={row?.displayOrder??0} min="0" name="displayOrder" type="number"/></label>
    <label className="text-sm font-semibold">Status<select className={`${inputClass} mt-1 w-full`} defaultValue={row?.status??"DRAFT"} name="status">{["DRAFT","IN_REVIEW","APPROVED","SCHEDULED","PUBLISHED","ARCHIVED"].map(status=><option key={status}>{status}</option>)}</select></label>
    <button className={`${buttonClass} md:col-span-2`}>{row?"Save popup changes":"Create popup"}</button>
  </form>;
}
