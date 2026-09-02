import { EmptyState, AdminPage, Panel, StatusBadge, buttonClass, inputClass, secondaryButtonClass, tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { createSocialCampaign, setSocialCampaignStatus } from "@/domain/marketing/social-actions";
import { socialFeatures } from "@/domain/marketing/social-automation";
import { prisma } from "@/lib/prisma";

const localInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export default async function SocialMarketingPage() {
  await requirePermission("marketing.content.view");
  const [products, campaigns, deliveries] = await Promise.all([
    prisma.supplierCatalogueProduct.findMany({ where: { active: true, availability: "IN_STOCK", stock: { gt: 0 }, images: { isEmpty: false } }, select: { id: true, name: true, brand: true }, orderBy: [{ brand: "asc" }, { name: "asc" }], take: 500 }),
    prisma.socialCampaign.findMany({ include: { _count: { select: { deliveries: true } } }, orderBy: [{ startsAt: "desc" }], take: 50 }),
    prisma.socialDelivery.findMany({ include: { campaign: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const start = new Date(); start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return <AdminPage title="Social media automation" description="Control campaign focus in the shop while n8n schedules, drafts, approves and publishes each post. Every attempt writes back to prevent repetition.">
    <Panel title="Create a focus campaign" description="Campaign posts are a separate stream from the evergreen product rotation. Higher priority wins when campaigns overlap.">
      <form action={createSocialCampaign} className="grid gap-4 lg:grid-cols-2">
        <label>Campaign name<input className={`${inputClass} mt-1`} name="name" placeholder="PC Builder focus week" required /></label>
        <label>Focus type<select className={`${inputClass} mt-1`} name="focusType"><option value="PRODUCT">Selected products</option><option value="FEATURE">Site feature or insight</option><option value="MIXED">Products and features</option></select></label>
        <label>Objective<input className={`${inputClass} mt-1`} name="objective" placeholder="Generate qualified PC-build enquiries" required /></label>
        <label>Audience<input className={`${inputClass} mt-1`} name="audience" defaultValue="South African businesses and technology buyers" required /></label>
        <label>Starts<input className={`${inputClass} mt-1`} name="startsAt" type="datetime-local" defaultValue={localInput(start)} required /></label>
        <label>Ends<input className={`${inputClass} mt-1`} name="endsAt" type="datetime-local" defaultValue={localInput(end)} required /></label>
        <label>Posts per day<input className={`${inputClass} mt-1`} name="postsPerDay" type="number" min="1" max="4" defaultValue="1" /></label>
        <label>Priority<input className={`${inputClass} mt-1`} name="priority" type="number" min="1" max="1000" defaultValue="100" /></label>
        <fieldset><legend className="text-sm">Channels</legend><div className="mt-2 flex flex-wrap gap-4 text-sm">{["LINKEDIN", "FACEBOOK", "INSTAGRAM"].map(channel => <label className="flex items-center gap-2" key={channel}><input name="channels" type="checkbox" value={channel} defaultChecked={channel === "LINKEDIN"}/>{channel}</label>)}</div></fieldset>
        <label>Status<select className={`${inputClass} mt-1`} name="status"><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option></select></label>
        <label>Feature focus<select className={`${inputClass} mt-1 min-h-32`} name="targetFeatureKeys" multiple>{Object.entries(socialFeatures).map(([key, feature]) => <option key={key} value={key}>{feature.title}</option>)}</select><small className="text-slate-500">Use Ctrl/Cmd to select more than one.</small></label>
        <label>Product focus<select className={`${inputClass} mt-1 min-h-32`} name="targetProductIds" multiple>{products.map(product => <option key={product.id} value={product.id}>{product.brand ? `${product.brand} · ` : ""}{product.name}</option>)}</select><small className="text-slate-500">Only active, in-stock products with images are shown.</small></label>
        <label className="lg:col-span-2">Content direction<textarea className={`${inputClass} mt-1 min-h-24`} name="instructions" placeholder="Angles to use, claims to avoid, campaign context, and desired call to action." /></label>
        <button className={`${buttonClass} lg:col-span-2`}>Create campaign</button>
      </form>
    </Panel>
    <Panel title="Campaigns">
      {campaigns.length ? <table className={tableClass}><thead><tr><th>Campaign</th><th>Focus</th><th>Window</th><th>Channels</th><th>Posts</th><th>Status</th><th>Action</th></tr></thead><tbody>{campaigns.map(campaign => <tr key={campaign.id}><td><strong>{campaign.name}</strong><small className="block text-slate-500">{campaign.objective}</small></td><td>{campaign.focusType}</td><td>{campaign.startsAt.toLocaleDateString("en-ZA")} – {campaign.endsAt.toLocaleDateString("en-ZA")}</td><td>{campaign.channels.join(", ")}</td><td>{campaign._count.deliveries}</td><td><StatusBadge value={campaign.status}/></td><td><form action={setSocialCampaignStatus}><input type="hidden" name="id" value={campaign.id}/><input type="hidden" name="status" value={campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE"}/><button className={secondaryButtonClass}>{campaign.status === "ACTIVE" ? "Pause" : "Activate"}</button></form></td></tr>)}</tbody></table> : <EmptyState title="No focus campaigns" description="Create a timed product or feature focus above. Evergreen product rotation can continue independently."/>}
    </Panel>
    <Panel title="Recent publishing ledger" description="Reserved, approved, rejected, failed and published attempts from every n8n social workflow.">
      {deliveries.length ? <table className={tableClass}><thead><tr><th>Created</th><th>Stream</th><th>Channel</th><th>Content</th><th>Campaign</th><th>Status</th><th>Published URL</th></tr></thead><tbody>{deliveries.map(delivery => <tr key={delivery.id}><td>{delivery.createdAt.toLocaleString("en-ZA")}</td><td>{delivery.stream}</td><td>{delivery.channel}</td><td>{delivery.contentType}</td><td>{delivery.campaign?.name ?? "—"}</td><td><StatusBadge value={delivery.status}/></td><td>{delivery.externalUrl ? <a className="text-sky-700 underline" href={delivery.externalUrl} target="_blank" rel="noreferrer">Open post</a> : "—"}</td></tr>)}</tbody></table> : <EmptyState title="No publishing activity" description="The ledger will populate when n8n requests its first delivery."/>}
    </Panel>
  </AdminPage>;
}
