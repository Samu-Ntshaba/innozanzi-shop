import type { PermissionEffect } from "@/generated/prisma/enums";

export const PERMISSIONS = [
  "products.view",
  "products.create",
  "products.update",
  "products.delete",
  "orders.view",
  "orders.update",
  "payments.approve",
  "quotations.manage",
  "customers.manage",
  "inventory.manage",
  "reports.view",
  "users.manage",
  "settings.manage",
  "partnership.view",
  "partnership.application.review",
  "partnership.application.approve",
  "partnership.application.reject",
  "partnership.partner.manage",
  "partnership.partner.suspend",
  "partnership.document.review",
  "partnership.request.view",
  "partnership.request.manage",
  "partnership.pricing.manage",
  "partnership.settings.manage",
  "partnership.report.view",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export type PermissionGrant = {
  key: string;
  effect: PermissionEffect;
};

export function isProtectedRoleRemoval(actorId: string, userId: string, roleSlug: string) {
  return actorId === userId && roleSlug === "super-administrator";
}

export function hasPermission(
  grants: readonly PermissionGrant[],
  permission: PermissionKey,
  isSuperAdministrator = false,
) {
  if (isSuperAdministrator) return true;
  const matching = grants.filter((grant) => grant.key === permission);
  if (matching.some((grant) => grant.effect === "DENY")) return false;
  return matching.some((grant) => grant.effect === "ALLOW");
}
