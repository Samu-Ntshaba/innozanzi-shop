import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS } from "../src/domain/auth/permissions";

const connectionString = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("A database URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const administrator = await prisma.role.upsert({
    where: { slug: "administrator" },
    update: { name: "Administrator", isSystem: true },
    create: { name: "Administrator", slug: "administrator", isSystem: true, description: "Business operations administrator." },
  });
  for (const key of PERMISSIONS) {
    const permission = await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
    if (key !== "users.manage" && key !== "rfq.approve" && key !== "rfq.commission.manage") {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: administrator.id, permissionId: permission.id } },
        update: { effect: "ALLOW" },
        create: { roleId: administrator.id, permissionId: permission.id, effect: "ALLOW" },
      });
    }
  }
  const employees = await prisma.user.findMany({
    where: { accountType: "INTERNAL_EMPLOYEE", deletedAt: null },
    select: { id: true, email: true, roles: { select: { roleId: true } } },
  });
  let repaired = 0;
  for (const employee of employees) {
    if (employee.roles.some(({ roleId }) => roleId === administrator.id)) continue;
    await prisma.userRole.create({ data: { userId: employee.id, roleId: administrator.id } });
    repaired += 1;
    console.log(`Granted Administrator access to ${employee.email}`);
  }
  console.log(`Checked ${employees.length} internal employee(s); repaired ${repaired}.`);
}

main().finally(() => prisma.$disconnect());