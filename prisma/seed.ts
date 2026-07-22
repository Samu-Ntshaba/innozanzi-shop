import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS } from "../src/domain/auth/permissions";
import { hashPassword } from "../src/domain/auth/password";

const connectionString = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("A database URL is required to seed.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const roles = [
  ["Super Administrator", "super-administrator"],
  ["Administrator", "administrator"],
  ["Sales", "sales"],
  ["Finance", "finance"],
  ["Inventory Manager", "inventory-manager"],
  ["Content Manager", "content-manager"],
  ["Support Agent", "support-agent"],
  ["Customer", "customer"],
] as const;

const rolePermissions: Record<string, readonly (typeof PERMISSIONS)[number][]> = {
  "super-administrator": PERMISSIONS,
  administrator: PERMISSIONS.filter((key) => key !== "users.manage"),
  sales: ["products.view", "orders.view", "orders.update", "quotations.manage", "customers.manage"],
  finance: ["orders.view", "payments.approve", "reports.view"],
  "inventory-manager": ["products.view", "products.update", "inventory.manage"],
  "content-manager": ["products.view", "products.update"],
  "support-agent": ["orders.view", "customers.manage"],
  customer: [],
};

async function main() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  for (const [name, slug] of roles) {
    await prisma.role.upsert({ where: { slug }, update: { name }, create: { name, slug, isSystem: true } });
  }

  const storedRoles = await prisma.role.findMany({ select: { id: true, slug: true } });
  const permissions = await prisma.permission.findMany({ select: { id: true, key: true } });
  for (const role of storedRoles) {
    const allowed = new Set(rolePermissions[role.slug] ?? []);
    await prisma.rolePermission.createMany({
      data: permissions
        .filter(({ key }) => allowed.has(key as (typeof PERMISSIONS)[number]))
        .map(({ id }) => ({ roleId: role.id, permissionId: id, effect: "ALLOW" })),
      skipDuplicates: true,
    });
  }

  const superRole = await prisma.role.findUniqueOrThrow({ where: { slug: "super-administrator" } });

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
    const user = await prisma.user.upsert({
      where: { email },
      update: { status: "ACTIVE", emailVerified: new Date() },
      create: {
        email,
        name: process.env.ADMIN_NAME ?? "Shop Administrator",
        passwordHash: await hashPassword(password),
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: superRole.id } },
      update: {},
      create: { userId: user.id, roleId: superRole.id },
    });
  }
}

main().finally(() => prisma.$disconnect());
