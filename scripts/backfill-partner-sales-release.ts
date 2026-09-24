import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Forward-only, idempotent release backfill. Review the counts in a non-
 * production environment first; this is deliberately separate from the
 * additive partner-sales migration so deployment never performs broad cleanup.
 */
async function main() {
  const supplierMedia = await prisma.partnerCatalogueAssignment.updateMany({
    where: { sourceType: "SUPPLIER_CATALOGUE_PRODUCT", mediaSnapshot: { not: Prisma.DbNull } },
    data: { mediaSnapshot: Prisma.DbNull },
  });
  const permissions = await prisma.permission.findMany({
    where: { key: { startsWith: "partner_sales." } },
    select: { id: true },
  });
  const roles = await prisma.role.findMany({
    where: { slug: { in: ["super-administrator", "administrator"] } },
    select: { id: true },
  });
  const removed = roles.length && permissions.length
    ? await prisma.rolePermission.deleteMany({ where: { roleId: { in: roles.map((role) => role.id) }, permissionId: { in: permissions.map((permission) => permission.id) } } })
    : { count: 0 };
  console.log(JSON.stringify({ supplierMediaCleared: supplierMedia.count, broadRoleGrantsRemoved: removed.count }));
}

main().finally(() => prisma.$disconnect());
