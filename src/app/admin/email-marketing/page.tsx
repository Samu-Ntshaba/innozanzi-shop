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
  resendCampaign,
  sendCampaign,
  sendCampaignTest,
  updateCampaign,
} from "@/domain/communications/actions";
import { requirePermission } from "@/domain/auth/session";
import { emailTemplates } from "@/integrations/email/templates";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type Query = {
  campaign?: string; generated?: string; saved?: string; test?: string;
  delivery?: string; accepted?: string; resent?: string;
  campaignSearch?: string; campaignStatus?: string; campaignPage?: string;
  subscriberSearch?: string; subscriberStatus?: string; subscriberPage?: string;
  deliverySearch?: string; deliveryStatus?: string; deliveryPage?: string;
};
const pageSize = 10;
const pageNumber = (value?: string) => Math.max(1, Number.parseInt(value ?? "1", 10) || 1);

export default async function EmailMarketingPage({ searchParams }: { searchParams: Promise<Query> }) {
  const context = await requirePermission("customers.manage");
  const query = await searchParams;
  const campaignPage = pageNumber(query.campaignPage);
  const subscriberPage = pageNumber(query.subscriberPage);
  const deliveryPage = pageNumber(query.deliveryPage);
  const selectedCampaignId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.campaign ?? "") ? query.campaign : undefined;
  const campaignWhere: Prisma.EmailCampaignWhereInput = {
    ...(query.campaignStatus === "DRAFT" || query.campaignStatus === "SENT" ? { status: query.campaignStatus } : {}),
    ...(query.campaignSearch ? { OR: [{ name: { contains: query.campaignSearch, mode: "insensitive" as const } }, { subject: { contains: query.campaignSearch, mode: "insensitive" as const } }] } : {}),
  };
  const subscriberWhere: Prisma.NewsletterSubscriberWhereInput = {
    ...(query.subscriberStatus === "ACTIVE" ? { isActive: true } : query.subscriberStatus === "UNSUBSCRIBED" ? { isActive: false } : {}),
    ...(query.subscriberSearch ? { OR: [{ email: { contains: query.subscriberSearch, mode: "insensitive" as const } }, { name: { contains: query.subscriberSearch, mode: "insensitive" as const } }, { source: { contains: query.subscriberSearch, mode: "insensitive" as const } }] } : {}),
  };
  const deliveryWhere: Prisma.NotificationWhereInput = {
    type: "EMAIL_OUTBOX",
    ...(query.deliveryStatus === "SENT" || query.deliveryStatus === "FAILED" || query.deliveryStatus === "PENDING" ? { status: query.deliveryStatus } : {}),
    ...(query.deliverySearch ? { OR: [{ subject: { contains: query.deliverySearch, mode: "insensitive" as const } }, { body: { contains: query.deliverySearch, mode: "insensitive" as const } }, { error: { contains: query.deliverySearch, mode: "insensitive" as const } }] } : {}),
  };
  const [subscribers, subscriberCount, campaigns, campaignCount, deliveries, deliveryCount, products, active, sentCount, failedCount, selected] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ where: subscriberWhere, orderBy: { subscribedAt: "desc" }, skip: (subscriberPage - 1) * pageSize, take: pageSize }),
    prisma.newsletterSubscriber.count({ where: subscriberWhere }),
    prisma.emailCampaign.findMany({ where: campaignWhere, orderBy: { createdAt: "desc" }, skip: (campaignPage - 1) * pageSize, take: pageSize }),
    prisma.emailCampaign.count({ where: campaignWhere }),
    prisma.notification.findMany({ where: deliveryWhere, orderBy: { createdAt: "desc" }, skip: (deliveryPage - 1) * pageSize, take: pageSize }),
    prisma.notification.count({ where: deliveryWhere }),
    prisma.product.findMany({
      where: { status: "PUBLISHED", deletedAt: null, isTestData: false },
      select: { id: true, name: true, sku: true, category: { select: { name: true } }, brand: { select: { name: true } } },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: 40,
    }),
    prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    prisma.emailCampaign.count({ where: { status: "SENT" } }),
    prisma.notification.count({ where: { type: "EMAIL_OUTBOX", status: "FAILED" } }),
    selectedCampaignId ? prisma.emailCampaign.findUnique({ where: { id: selectedCampaignId } }) : Promise.resolve(null),
  ]);
  const deliverySummaries = await Promise.all(campaigns.map(async campaign => {
    const records = await prisma.notification.findMany({
      where: { type: "EMAIL_OUTBOX", data: { path: ["idempotencyKey"], string_starts_with: `campaign:${campaign.id}:` } },
      select: { status: true, data: true },
    });
    const production = records.filter(record => {
      const data = record.data as { idempotencyKey?: string; deliveryMode?: string; messageId?: string } | null;
      return !data?.idempotencyKey?.includes(":test:");
    });
    return [campaign.id, {
      accepted: production.filter(record => {
        const data = record.data as { messageId?: string } | null;
        return record.status === "SENT" && Boolean(data?.messageId);
      }).length,
      failed: production.filter(record => record.status === "FAILED").length,
    }] as const;
  }));
  const summaries = new Map(deliverySummaries);
  const preview = selected ? emailTemplates.campaign("preview@innozanzi.co.za", selected.subject, selected.preview ?? selected.subject, selected.html, `${selected.id}:preview`, true).html : null;

  return <AdminPage title="Email marketing" description="Create branded, product-aware campaigns, review the exact email and send through the controlled subscriber outbox.">
    {query.generated ? <div className={`border px-4 py-3 text-sm ${query.generated === "ai" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{query.generated === "ai" ? "OpenAI created the copy from the selected product data. Review and test it before sending." : "OpenAI was unavailable, so a safe branded fallback draft was created. Review it before sending."}</div> : null}
    {query.saved ? <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Campaign changes saved.</div> : null}
    {query.test ? <div className="border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">Test email queued for delivery.</div> : null}
    {query.delivery === "accepted" ? <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{query.accepted} email{query.accepted === "1" ? "" : "s"} accepted by the configured provider{query.resent ? " during the resend" : ""}. Inbox delivery can still be affected by recipient servers, spam filtering or bounces.</div> : null}

    <div className="grid grid-cols-3 border border-slate-300 bg-white">
      <Metric label="Active subscribers" value={active}/>
      <Metric label="Campaigns sent" value={sentCount}/>
      <Metric label="Failed delivery" value={failedCount}/>
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
        </div> : <form action={resendCampaign} className="mt-5 border border-amber-200 bg-amber-50 p-4"><input name="id" type="hidden" value={selected.id}/><p className="text-sm text-amber-900">Send a new copy to all {active} active subscribers and record a separate provider delivery run.</p><button className="mt-3 border border-amber-400 bg-white px-4 py-2 text-sm font-bold text-amber-950">Resend campaign</button></form>}
      </Panel> : <Panel title="Campaign workflow"><ol className="space-y-4 text-sm">{["Select published products and describe the campaign goal.","OpenAI drafts factual copy from those products only.","Review the exact responsive email and adjust the draft.","Send a test to yourself before releasing the campaign.","Send through the outbox to active subscribers with unsubscribe links."].map((step, index) => <li className="flex gap-3" key={step}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-800">{index + 1}</span><span className="pt-1">{step}</span></li>)}</ol><div className="mt-6 grid gap-3 sm:grid-cols-3">{[["Spotlight","Focused product promotion"],["Essentials","Practical business selection"],["New arrivals","Fresh catalogue introduction"]].map(([name, detail]) => <div className="border border-slate-200 bg-slate-50 p-4" key={name}><p className="font-semibold">{name}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>)}</div></Panel>}
    </div>

    <Panel className="p-0">
      <div className="flex items-center justify-between gap-3 p-4"><h2 className="font-semibold">Campaigns</h2><details><summary className="cursor-pointer text-sm font-semibold text-sky-700">Create manual draft</summary><form action={createCampaign} className="mt-4 grid min-w-[min(34rem,80vw)] gap-3"><input className={inputClass} name="name" placeholder="Internal campaign name" required/><input className={inputClass} name="subject" placeholder="Email subject" required/><input className={inputClass} name="preview" placeholder="Inbox preview text"/><textarea className={`${inputClass} min-h-40`} name="html" placeholder="Campaign content (basic HTML supported)" required/><button className={buttonClass}>Save manual draft</button></form></details></div>
      <FilterBar searchName="campaignSearch" searchValue={query.campaignSearch} statusName="campaignStatus" statusValue={query.campaignStatus} statuses={["DRAFT","SENT"]}/>
      <div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Campaign</th><th>Status</th><th>Provider record</th><th>Action</th></tr></thead><tbody>{campaigns.map(campaign => {const summary=summaries.get(campaign.id);return <tr key={campaign.id}><td><strong>{campaign.name}</strong><br/><span className="text-xs text-slate-500">{campaign.subject}</span></td><td><StatusBadge value={campaign.status}/></td><td><span className="text-emerald-700">{summary?.accepted ?? 0} accepted</span>{summary?.failed ? <><br/><span className="text-red-700">{summary.failed} failed</span></> : null}{campaign.status==="SENT"&&!summary?.accepted?<><br/><span className="text-xs font-semibold text-amber-700">Not verified in outbox</span></>:null}</td><td><Link className="font-semibold text-sky-700" href={queryHref(query,{campaign:campaign.id})}>{campaign.status === "DRAFT" ? "Edit & preview" : "View & resend"}</Link></td></tr>})}{!campaigns.length?<tr><td colSpan={4}>No campaigns match these filters.</td></tr>:null}</tbody></table></div>
      <Pagination query={query} pageKey="campaignPage" page={campaignPage} total={campaignCount}/>
    </Panel>

    <details className="border border-slate-300 bg-white"><summary className="cursor-pointer p-4 font-semibold">Subscribers ({subscriberCount})</summary><FilterBar searchName="subscriberSearch" searchValue={query.subscriberSearch} statusName="subscriberStatus" statusValue={query.subscriberStatus} statuses={["ACTIVE","UNSUBSCRIBED"]}/><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Subscriber</th><th>Source</th><th>Status</th><th>Subscribed</th></tr></thead><tbody>{subscribers.map(subscriber => <tr key={subscriber.id}><td>{subscriber.name ?? "Subscriber"}<br/><span className="text-xs text-slate-500">{subscriber.email}</span></td><td>{subscriber.source}</td><td><StatusBadge value={subscriber.isActive ? "ACTIVE" : "UNSUBSCRIBED"}/></td><td>{subscriber.subscribedAt.toLocaleDateString("en-ZA")}</td></tr>)}</tbody></table></div><Pagination query={query} pageKey="subscriberPage" page={subscriberPage} total={subscriberCount}/></details>

    <details className="border border-slate-300 bg-white"><summary className="cursor-pointer p-4 font-semibold">Email delivery history ({deliveryCount})</summary><FilterBar searchName="deliverySearch" searchValue={query.deliverySearch} statusName="deliveryStatus" statusValue={query.deliveryStatus} statuses={["SENT","FAILED","PENDING"]}/><p className="px-4 pb-3 text-xs text-slate-500">Sent means accepted by the configured provider. Final inbox placement remains controlled by the recipient’s mail server.</p><div className="overflow-x-auto"><table className={tableClass}><thead><tr><th>Message</th><th>Recipient</th><th>Status</th><th>Provider evidence</th><th>Time</th><th>Action</th></tr></thead><tbody>{deliveries.map(delivery => {const data=delivery.data as {to?:string;messageId?:string;deliveryMode?:string}|null;return <tr key={delivery.id}><td>{delivery.subject}</td><td>{data?.to ?? "—"}</td><td><StatusBadge value={delivery.status}/>{delivery.error ? <p className="mt-1 max-w-xs text-xs text-red-700">{delivery.error}</p> : null}</td><td className="text-xs">{data?.messageId?`Accepted · ${data.deliveryMode??"provider"}`:"No message ID"}</td><td>{delivery.createdAt.toLocaleString("en-ZA")}</td><td>{delivery.status === "FAILED" ? <form action={retryMarketingEmail}><input name="id" type="hidden" value={delivery.id}/><button className="font-semibold text-sky-700">Retry</button></form> : "—"}</td></tr>})}</tbody></table></div><Pagination query={query} pageKey="deliveryPage" page={deliveryPage} total={deliveryCount}/></details>
  </AdminPage>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border-r border-slate-300 p-4 last:border-r-0"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}

function FilterBar({searchName,searchValue,statusName,statusValue,statuses}:{searchName:string;searchValue?:string;statusName:string;statusValue?:string;statuses:string[]}) {
  return <form className="grid gap-2 border-y border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_13rem_auto]">
    <input className={inputClass} name={searchName} defaultValue={searchValue} placeholder="Search"/>
    <select className={inputClass} name={statusName} defaultValue={statusValue??""}><option value="">All statuses</option>{statuses.map(status=><option key={status} value={status}>{status.replaceAll("_"," ").toLowerCase()}</option>)}</select>
    <button className="border border-slate-300 bg-white px-4 py-2 text-sm font-bold">Apply</button>
  </form>;
}

function queryHref(query:Query, updates:Partial<Query>) {
  const params=new URLSearchParams();
  for(const [key,value] of Object.entries({...query,...updates})) if(value) params.set(key,value);
  return `/admin/email-marketing?${params.toString()}`;
}

function Pagination({query,pageKey,page,total}:{query:Query;pageKey:"campaignPage"|"subscriberPage"|"deliveryPage";page:number;total:number}) {
  const pages=Math.max(1,Math.ceil(total/pageSize));
  if(pages<=1)return null;
  return <div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm"><span>Page {page} of {pages} · {total} records</span><div className="flex gap-2">{page>1?<Link className="border border-slate-300 px-3 py-1.5 font-semibold" href={queryHref(query,{[pageKey]:String(page-1)})}>Previous</Link>:null}{page<pages?<Link className="border border-slate-300 px-3 py-1.5 font-semibold" href={queryHref(query,{[pageKey]:String(page+1)})}>Next</Link>:null}</div></div>;
}
