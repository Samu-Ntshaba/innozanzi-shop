import Link from "next/link";
import {
  AdminPage,
  buttonClass,
  inputClass,
  Panel,
  StatusBadge,
  tableClass,
} from "@/components/admin/admin-ui";
import {
  createCampaign,
  generateProductCampaign,
  retryMarketingEmail,
  sendCampaign,
  sendCampaignTest,
  updateCampaign,
} from "@/domain/communications/actions";
import { requirePermission } from "@/domain/auth/session";
import { emailTemplates } from "@/integrations/email/templates";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EmailMarketingPage({ searchParams }: { searchParams: Promise<{ campaign?: string; generated?: string; saved?: string; test?: string }> }) {
  const context = await requirePermission("customers.manage");
  const query = await searchParams;
  const [subscribers, campaigns, deliveries, products] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ orderBy: { subscribedAt: "desc" }, take: 200 }),
    prisma.emailCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.notification.findMany({ where: { type: "EMAIL_OUTBOX" }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.product.findMany({
      where: { status: "PUBLISHED", deletedAt: null, isTestData: false },
      select: { id: true, name: true, sku: true, category: { select: { name: true } }, brand: { select: { name: true } } },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: 40,
    }),
  ]);
  const active = subscribers.filter(subscriber => subscriber.isActive).length;
  const selected = campaigns.find(campaign => campaign.id === query.campaign);
  const preview = selected ? emailTemplates.campaign("preview@innozanzi.co.za", selected.subject, selected.preview ?? selected.subject, selected.html, `${selected.id}:preview`, true).html : null;

  return <AdminPage title="Email marketing" description="Create branded, product-aware campaigns, review the exact email and send through the controlled subscriber outbox.">
    {query.generated ? <div className={`border px-4 py-3 text-sm ${query.generated === "ai" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{query.generated === "ai" ? "OpenAI created the copy from the selected product data. Review and test it before sending." : "OpenAI was unavailable, so a safe branded fallback draft was created. Review it before sending."}</div> : null}
    {query.saved ? <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Campaign changes saved.</div> : null}
    {query.test ? <div className="border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">Test email queued for delivery.</div> : null}

    <div className="grid grid-cols-3 border border-slate-300 bg-white">
      <Metric label="Active subscribers" value={active}/>
      <Metric label="Campaigns sent" value={campaigns.filter(campaign => campaign.status === "SENT").length}/>
      <Metric label="Failed delivery" value={deliveries.filter(delivery => delivery.status === "FAILED").length}/>
    </div>

    <div className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
      <Panel title="Generate from products">
        <p className="text-sm leading-6 text-slate-600">OpenAI drafts only the copy. Innozanzi’s renderer controls the logo, colours, product cards, links, compliance footer and responsive layout.</p>
        <form action={generateProductCampaign} className="mt-5 grid gap-4">
          <label className="text-sm font-semibold">Internal campaign name<input className={`${inputClass} mt-1 w-full`} name="name" placeholder="August business essentials" required/></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Template<select className={`${inputClass} mt-1 w-full`} name="template"><option value="SPOTLIGHT">Product spotlight</option><option value="ESSENTIALS">Business essentials</option><option value="NEW_ARRIVALS">New arrivals</option></select></label>
            <label className="text-sm font-semibold">Tone<select className={`${inputClass} mt-1 w-full`} name="tone"><option value="PROFESSIONAL">Professional</option><option value="HELPFUL">Helpful</option><option value="CONFIDENT">Confident</option></select></label>
          </div>
          <label className="text-sm font-semibold">Campaign goal<textarea className={`${inputClass} mt-1 min-h-24 w-full`} name="goal" placeholder="Introduce practical workstation upgrades for growing businesses without using discounts or urgency." required/></label>
          <fieldset>
            <legend className="text-sm font-semibold">Products <span className="font-normal text-slate-500">(choose 1–4)</span></legend>
            <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {products.map(product => <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-slate-50" key={product.id}><input className="mt-1" name="productIds" type="checkbox" value={product.id}/><span className="min-w-0"><strong className="block truncate text-sm">{product.name}</strong><span className="text-xs text-slate-500">{product.brand?.name ?? product.category.name} · {product.sku}</span></span></label>)}
              {!products.length ? <p className="p-3 text-sm text-slate-500">Publish products before generating a campaign.</p> : null}
            </div>
          </fieldset>
          <button className={buttonClass} disabled={!products.length}>Generate branded draft</button>
        </form>
      </Panel>

      {selected ? <Panel title="Edit, preview and test">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{selected.name}</p><p className="text-xs text-slate-500">Changes affect this draft only.</p></div><StatusBadge value={selected.status}/></div>
        {selected.status === "DRAFT" ? <form action={updateCampaign} className="grid gap-3">
          <input name="id" type="hidden" value={selected.id}/>
          <label className="text-sm font-semibold">Campaign name<input className={`${inputClass} mt-1 w-full`} name="name" defaultValue={selected.name} required/></label>
          <label className="text-sm font-semibold">Subject<input className={`${inputClass} mt-1 w-full`} name="subject" defaultValue={selected.subject} required/></label>
          <label className="text-sm font-semibold">Inbox preview<input className={`${inputClass} mt-1 w-full`} name="preview" defaultValue={selected.preview ?? ""}/></label>
          <label className="text-sm font-semibold">Email content HTML<textarea className={`${inputClass} mt-1 min-h-52 w-full font-mono text-xs`} name="html" defaultValue={selected.html} required/></label>
          <button className={buttonClass}>Save draft changes</button>
        </form> : null}
        <h3 className="mt-6 text-sm font-semibold">Exact email preview</h3>
        <iframe className="mt-2 h-[680px] w-full rounded-lg border border-slate-300 bg-white" sandbox="" srcDoc={preview ?? ""} title={`Preview of ${selected.name}`}/>
        {selected.status === "DRAFT" ? <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <form action={sendCampaignTest} className="flex min-w-0 gap-2"><input name="id" type="hidden" value={selected.id}/><input className={`${inputClass} min-w-0 flex-1`} defaultValue={context.user.email} name="email" type="email" required/><button className="border border-slate-300 px-4 py-2 text-sm font-bold">Send test</button></form>
          <form action={sendCampaign}><input name="id" type="hidden" value={selected.id}/><button className={`${buttonClass} w-full`}>Send to {active} subscribers</button></form>
        </div> : null}
      </Panel> : <Panel title="Campaign workflow"><ol className="space-y-4 text-sm">{["Select published products and describe the campaign goal.","OpenAI drafts factual copy from those products only.","Review the exact responsive email and adjust the draft.","Send a test to yourself before releasing the campaign.","Send through the outbox to active subscribers with unsubscribe links."].map((step, index) => <li className="flex gap-3" key={step}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-800">{index + 1}</span><span className="pt-1">{step}</span></li>)}</ol><div className="mt-6 grid gap-3 sm:grid-cols-3">{[["Spotlight","Focused product promotion"],["Essentials","Practical business selection"],["New arrivals","Fresh catalogue introduction"]].map(([name, detail]) => <div className="border border-slate-200 bg-slate-50 p-4" key={name}><p className="font-semibold">{name}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>)}</div></Panel>}
    </div>

    <Panel className="p-0">
      <div className="flex items-center justify-between gap-3 p-4"><h2 className="font-semibold">Campaigns</h2><details><summary className="cursor-pointer text-sm font-semibold text-sky-700">Create manual draft</summary><form action={createCampaign} className="mt-4 grid min-w-[min(34rem,80vw)] gap-3"><input className={inputClass} name="name" placeholder="Internal campaign name" required/><input className={inputClass} name="subject" placeholder="Email subject" required/><input className={inputClass} name="preview" placeholder="Inbox preview text"/><textarea className={`${inputClass} min-h-40`} name="html" placeholder="Campaign content (basic HTML supported)" required/><button className={buttonClass}>Save manual draft</button></form></details></div>
      <div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Campaign</th><th>Status</th><th>Audience</th><th>Action</th></tr></thead><tbody>{campaigns.map(campaign => <tr key={campaign.id}><td><strong>{campaign.name}</strong><br/><span className="text-xs text-slate-500">{campaign.subject}</span></td><td><StatusBadge value={campaign.status}/></td><td>{active}</td><td><Link className="font-semibold text-sky-700" href={`/admin/email-marketing?campaign=${campaign.id}`}>{campaign.status === "DRAFT" ? "Edit & preview" : "View"}</Link></td></tr>)}</tbody></table></div>
    </Panel>

    <details className="border border-slate-300 bg-white"><summary className="cursor-pointer p-4 font-semibold">Subscribers ({subscribers.length})</summary><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Subscriber</th><th>Source</th><th>Status</th><th>Subscribed</th></tr></thead><tbody>{subscribers.map(subscriber => <tr key={subscriber.id}><td>{subscriber.name ?? "Subscriber"}<br/><span className="text-xs text-slate-500">{subscriber.email}</span></td><td>{subscriber.source}</td><td><StatusBadge value={subscriber.isActive ? "ACTIVE" : "UNSUBSCRIBED"}/></td><td>{subscriber.subscribedAt.toLocaleDateString("en-ZA")}</td></tr>)}</tbody></table></div></details>

    <details className="border border-slate-300 bg-white"><summary className="cursor-pointer p-4 font-semibold">Email delivery history</summary><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Message</th><th>Recipient</th><th>Status</th><th>Time</th><th>Action</th></tr></thead><tbody>{deliveries.map(delivery => {const data=delivery.data as {to?:string}|null;return <tr key={delivery.id}><td>{delivery.subject}</td><td>{data?.to ?? "—"}</td><td><StatusBadge value={delivery.status}/>{delivery.error ? <p className="mt-1 max-w-xs text-xs text-red-700">{delivery.error}</p> : null}</td><td>{delivery.createdAt.toLocaleString("en-ZA")}</td><td>{delivery.status === "FAILED" ? <form action={retryMarketingEmail}><input name="id" type="hidden" value={delivery.id}/><button className="font-semibold text-sky-700">Retry</button></form> : "—"}</td></tr>})}</tbody></table></div></details>
  </AdminPage>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border-r border-slate-300 p-4 last:border-r-0"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}
