import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Forward-only, idempotent release backfill. Review the counts in a non-
 * production environment first; this is deliberately separate from the
 * additive partner-sales migration so deployment never performs broad cleanup.
 */
async function main() {
  const apply = process.argv.includes("--apply");
  const supplierMediaWhere = {
    sourceType: "SUPPLIER_CATALOGUE_PRODUCT" as const,
    mediaSnapshot: { not: Prisma.DbNull },
  };
  const supplierMediaCount = await prisma.partnerCatalogueAssignment.count({ where: supplierMediaWhere });
  const permissions = await prisma.permission.findMany({
    where: { key: { startsWith: "partner_sales." } },
    select: { id: true },
  });
  const roles = await prisma.role.findMany({
    where: { slug: { in: ["super-administrator", "administrator"] } },
    select: { id: true },
  });
  const rolePermissionWhere = roles.length && permissions.length
    ? { roleId: { in: roles.map((role) => role.id) }, permissionId: { in: permissions.map((permission) => permission.id) } }
    : undefined;
  const broadRoleGrantCount = rolePermissionWhere ? await prisma.rolePermission.count({ where: rolePermissionWhere }) : 0;
  console.log(JSON.stringify({ apply, supplierMediaToClear: supplierMediaCount, broadRoleGrantsToRemove: broadRoleGrantCount }));
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to perform the targeted backfill.");
    return;
  }
  const supplierMedia = await prisma.partnerCatalogueAssignment.updateMany({
    where: { sourceType: "SUPPLIER_CATALOGUE_PRODUCT", mediaSnapshot: { not: Prisma.DbNull } },
    data: { mediaSnapshot: Prisma.DbNull },
  });
  const removed = roles.length && permissions.length
    ? await prisma.rolePermission.deleteMany({ where: { roleId: { in: roles.map((role) => role.id) }, permissionId: { in: permissions.map((permission) => permission.id) } } })
    : { count: 0 };
  console.log(JSON.stringify({ supplierMediaCleared: supplierMedia.count, broadRoleGrantsRemoved: removed.count }));
}

main().finally(() => prisma.$disconnect());
