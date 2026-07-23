import { AdminPage, Panel, buttonClass, inputClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { createManualPartner } from "@/domain/partnerships/admin-actions";
import { prisma } from "@/lib/prisma";

export default async function NewPartnerPage() {
  await requirePermission("partnership.partner.manage");
  const [clients, types, managers] = await Promise.all([
    prisma.user.findMany({
      where: {
        accountType: "CUSTOMER",
        status: "ACTIVE",
        emailVerified: { not: null },
        deletedAt: null,
        customerProfile: { isNot: null },
        partnerships: { none: { status: { in: ["APPROVED", "CONDITIONALLY_APPROVED", "SUSPENDED"] } } },
      },
      include: { customerProfile: { include: { company: true } } },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
    prisma.partnershipType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { accountType: "INTERNAL_EMPLOYEE", status: "ACTIVE", deletedAt: null }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);

  return <AdminPage title="Add partner manually" description="Promote an existing verified client into the governed partnership lifecycle. A separate partner login is never created.">
    <Panel title="Partner details" description="The client, approval history, annual review and audit record are created together.">
      {clients.length ? <form action={createManualPartner} className="grid gap-4 sm:grid-cols-2">
        <label className="font-semibold">Registered client<select className={`${inputClass} mt-1 w-full`} name="userId" required><option value="">Select client</option>{clients.map(client=><option key={client.id} value={client.id}>{client.customerProfile?.company?.companyName??client.name??client.email} · {client.email}</option>)}</select></label>
        <label className="font-semibold">Partnership track<select className={`${inputClass} mt-1 w-full`} name="partnershipTypeId" required><option value="">Select track</option>{types.map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
        <label className="font-semibold">Account manager<select className={`${inputClass} mt-1 w-full`} name="accountManagerId"><option value="">Unassigned</option>{managers.map(manager=><option key={manager.id} value={manager.id}>{manager.name??manager.email}</option>)}</select></label>
        <label className="font-semibold">Approval status<select className={`${inputClass} mt-1 w-full`} name="status"><option value="APPROVED">Approved</option><option value="CONDITIONALLY_APPROVED">Conditionally approved</option></select></label>
        <label className="font-semibold sm:col-span-2">Decision and onboarding note<textarea className={`${inputClass} mt-1 min-h-28 w-full`} name="reason" placeholder="Why the partnership is being approved and any conditions the client must meet." required/></label>
        <button className={`${buttonClass} sm:col-span-2`}>Create partner and notify client</button>
      </form>:<div className="rounded-lg border border-dashed p-8 text-center"><p className="font-semibold">No eligible clients are available.</p><p className="mt-2 text-sm text-slate-600">The person must first have an active, email-verified customer account and customer profile.</p></div>}
    </Panel>
  </AdminPage>;
}
