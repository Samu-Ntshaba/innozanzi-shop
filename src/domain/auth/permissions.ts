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
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export type PermissionGrant = {
  key: string;
  effect: PermissionEffect;
};

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
