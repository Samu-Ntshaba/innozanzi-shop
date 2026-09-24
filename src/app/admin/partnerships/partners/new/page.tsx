import { AdminPage, Panel } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { ManualPartnerForm } from "./manual-partner-form";

export default async function NewPartnerPage({searchParams}:{searchParams:Promise<{error?:string}>}) {
  await requirePermission("partnership.partner.manage");
  const {error}=await searchParams;
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

  return <AdminPage title="Register sales partner" description="Approve a partner directly, or connect an existing Innozanzi customer to the sales-partner programme.">
    {error?<div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error==="duplicate"?"This person already has an account or active partnership. Choose the existing-client option or open their partner record.":"The partner could not be registered. Check the details and try again."}</div>:null}
    <Panel title="Partner and invitation details" description="A new partner receives a secure, single-use link to choose their password. Innozanzi never emails a password.">
      <ManualPartnerForm
        clients={clients.map(client=>({id:client.id,label:`${client.customerProfile?.company?.companyName??client.name??client.email} · ${client.email}`}))}
        types={types.map(type=>({id:type.id,label:type.name}))}
        managers={managers.map(manager=>({id:manager.id,label:manager.name??manager.email}))}
      />
    </Panel>
  </AdminPage>;
}
