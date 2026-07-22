import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/domain/auth/password";
import { PERMISSIONS } from "../src/domain/auth/permissions";

async function main() {
  const connectionString = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!connectionString || !email || !password) throw new Error("DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD are required.");
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const role = await prisma.role.upsert({ where: { slug: "super-administrator" }, update: { name: "Super Administrator", isSystem: true }, create: { name: "Super Administrator", slug: "super-administrator", isSystem: true } });
    for (const key of PERMISSIONS) {
      const permission = await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
      await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: { effect: "ALLOW" }, create: { roleId: role.id, permissionId: permission.id, effect: "ALLOW" } });
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.upsert({ where: { email }, update: { name: process.env.ADMIN_NAME ?? "Innozanzi Super Administrator", passwordHash, status: "ACTIVE", emailVerified: new Date() }, create: { email, name: process.env.ADMIN_NAME ?? "Innozanzi Super Administrator", passwordHash, status: "ACTIVE", emailVerified: new Date() } });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } });
    console.log(`Super administrator ready: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
