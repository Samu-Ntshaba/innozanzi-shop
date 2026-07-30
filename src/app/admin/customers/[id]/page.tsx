import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage, Panel, StatusBadge, buttonClass, inputClass, secondaryButtonClass, tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { addCustomerNote, updateCustomer } from "@/domain/crm/actions";
import { assignClientPortal, setClientPortalStatus } from "@/domain/client-portal/actions";
import { prisma } from "@/lib/prisma";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("customers.manage");
  const { id } = await params;
  const [customer, fields] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { customerProfile: { include: { company: true, clientPortal:true, notes: { include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } } } }, orders: { select: { id: true, orderNumber: true, status: true, grandTotal: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 10 } } }),
    prisma.crmCustomField.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  if (!customer?.customerProfile) notFound();
  const profile = customer.customerProfile;
  const values = (profile.customFields && typeof profile.customFields === "object" && !Array.isArray(profile.customFields) ? profile.customFields : {}) as Record<string, unknown>;
  const displayName = customer.name || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.company?.companyName || "Unnamed customer";
  return <AdminPage title={displayName} description={`CRM customer · ${profile.source.toLowerCase()} source`} actions={<Link className={secondaryButtonClass} href="/admin/customers">Back to customers</Link>}>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="space-y-4">
        <form action={updateCustomer} className="space-y-4">
          <input type="hidden" name="userId" value={customer.id} />
          <Panel title="Contact and company" description="Edit this CRM record. It does not require an online account.">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">First name<input className={`${inputClass} mt-1 w-full`} name="firstName" defaultValue={profile.firstName ?? ""} /></label>
              <label className="text-sm font-semibold">Last name<input className={`${inputClass} mt-1 w-full`} name="lastName" defaultValue={profile.lastName ?? ""} /></label>
              <label className="text-sm font-semibold">Email<input className={`${inputClass} mt-1 w-full`} name="email" type="email" defaultValue={customer.email.endsWith("@internal.invalid") ? "" : customer.email} /></label>
              <label className="text-sm font-semibold">Phone<input className={`${inputClass} mt-1 w-full`} name="phone" defaultValue={customer.phone ?? ""} /></label>
              <label className="text-sm font-semibold sm:col-span-2">Company<input className={`${inputClass} mt-1 w-full`} name="companyName" defaultValue={profile.company?.companyName ?? ""} /></label>
              {fields.map((field) => <label className="text-sm font-semibold" key={field.id}>{field.label}<input className={`${inputClass} mt-1 w-full`} name={`custom:${field.key}`} defaultValue={String(values[field.key] ?? "")} /></label>)}
            </div>
            <div className="mt-4 flex justify-end"><button className={buttonClass}>Save changes</button></div>
          </Panel>
        </form>
        <Panel title="Recent orders" description="Commerce activity linked to this customer.">
          {customer.orders.length ? <table className={tableClass}><thead><tr><th>Order</th><th>Status</th><th>Total</th><th>Date</th></tr></thead><tbody>{customer.orders.map((order) => <tr key={order.id}><td><Link className="font-semibold text-sky-700" href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link></td><td><StatusBadge value={order.status} /></td><td>R {Number(order.grandTotal).toFixed(2)}</td><td>{order.createdAt.toLocaleDateString("en-ZA")}</td></tr>)}</tbody></table> : <p className="text-sm text-slate-500">No orders yet.</p>}
        </Panel>
        <Panel title="Client Portal" description="Assign a dedicated business portal to this existing client. No duplicate client or account is created.">
          {profile.clientPortal?<div className="mb-4 grid gap-3 text-sm sm:grid-cols-4"><div><p className="text-slate-500">Status</p><StatusBadge value={profile.clientPortal.status}/></div><div><p className="text-slate-500">Tier</p><strong>{profile.clientPortal.tier}</strong></div><div><p className="text-slate-500">Invitation</p><strong>{profile.clientPortal.invitationStatus}</strong></div><div><p className="text-slate-500">Assigned</p><strong>{profile.clientPortal.invitedAt?.toLocaleDateString("en-ZA")??"—"}</strong></div></div>:null}
          <form action={assignClientPortal} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="userId" value={customer.id}/>
            <label className="text-sm font-semibold">Portal tier<select className={`${inputClass} mt-1 w-full`} name="tier" defaultValue={profile.clientPortal?.tier??"STANDARD"}>{["STANDARD","PRIORITY","MANAGED","ENTERPRISE"].map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="text-sm font-semibold sm:col-span-2">Internal relationship notes<textarea className={`${inputClass} mt-1 min-h-20 w-full`} name="internalNotes" defaultValue={profile.clientPortal?.internalNotes??""}/></label>
            <fieldset className="grid gap-2 sm:col-span-2 sm:grid-cols-3"><legend className="mb-2 text-sm font-semibold">Enabled modules</legend>{["PRODUCTS","QUOTATIONS","ORDERS","PAYMENTS","DELIVERIES","RETURNS","SUPPORT","TECHNICIANS","TRAINING","DOCUMENTS","REPORTS","USER_MANAGEMENT"].map(module=><label className="flex items-center gap-2 text-sm" key={module}><input name={`module:${module}`} type="checkbox" defaultChecked={profile.clientPortal?profile.clientPortal.modules.includes(module):["PRODUCTS","QUOTATIONS","ORDERS","DELIVERIES","RETURNS","SUPPORT","DOCUMENTS"].includes(module)}/>{module.replaceAll("_"," ")}</label>)}</fieldset>
            <button className={`${buttonClass} sm:col-span-2`}>{profile.clientPortal?"Update portal and resend access email":"Assign Client Portal and email login"}</button>
          </form>
          {profile.clientPortal?<form action={setClientPortalStatus} className="mt-3"><input type="hidden" name="userId" value={customer.id}/><input type="hidden" name="status" value={profile.clientPortal.status==="ACTIVE"?"SUSPENDED":"ACTIVE"}/><button className={secondaryButtonClass}>{profile.clientPortal.status==="ACTIVE"?"Suspend portal access":"Reactivate portal access"}</button></form>:null}
        </Panel>
      </div>
      <Panel title="Notes" description="Keep calls, follow-ups, preferences, and internal context on the customer record.">
        <form action={addCustomerNote} className="space-y-2">
          <input type="hidden" name="userId" value={customer.id} /><input type="hidden" name="customerProfileId" value={profile.id} />
          <textarea className={`${inputClass} min-h-28 w-full`} name="body" placeholder="Add a note…" required />
          <button className={buttonClass}>Add note</button>
        </form>
        <div className="mt-5 space-y-3">{profile.notes.map((note) => <article className="border-l-2 border-sky-600 bg-slate-50 p-3" key={note.id}><p className="whitespace-pre-wrap text-sm text-slate-800">{note.body}</p><p className="mt-2 text-[11px] text-slate-500">{note.author?.name ?? note.author?.email ?? "Former staff"} · {note.createdAt.toLocaleString("en-ZA")}</p></article>)}{!profile.notes.length ? <p className="text-sm text-slate-500">No notes have been added.</p> : null}</div>
      </Panel>
    </div>
  </AdminPage>;
}
