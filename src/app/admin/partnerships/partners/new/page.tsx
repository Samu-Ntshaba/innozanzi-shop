import { AdminPage, Panel } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { ManualPartnerForm } from "./manual-partner-form";

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

  return <AdminPage title="Add partner manually" description="Add a new person directly or connect an existing client to the governed partnership lifecycle.">
    <Panel title="Partner details" description="For a new person, the customer account, activation invitation, partnership, annual review and audit history are created together.">
      <ManualPartnerForm
        clients={clients.map(client=>({id:client.id,label:`${client.customerProfile?.company?.companyName??client.name??client.email} · ${client.email}`}))}
        types={types.map(type=>({id:type.id,label:type.name}))}
        managers={managers.map(manager=>({id:manager.id,label:manager.name??manager.email}))}
      />
    </Panel>
  </AdminPage>;
}
