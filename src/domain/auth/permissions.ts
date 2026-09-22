import type { PermissionEffect } from "@/generated/prisma/enums";

export const PARTNER_SALES_PERMISSIONS = [
  "partner_sales.profile.approve",
  "partner_sales.catalogue.manage",
  "partner_sales.pricing.approve",
  "partner_sales.commission.manage",
  "partner_sales.payout.prepare",
  "partner_sales.payout.approve",
] as const;

export const BROAD_AUTO_MANAGED_ROLE_SLUGS = [
  "super-administrator",
  "administrator",
] as const;

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
  "trading.view",
  "trading.market.manage",
  "trading.rules.manage",
  "trading.decisions.manage",
  "trading.audit.view",
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
  ...PARTNER_SALES_PERMISSIONS,
  "rfq.view",
  "rfq.create",
  "rfq.update",
  "rfq.delete",
  "rfq.analyse",
  "rfq.price",
  "rfq.submit",
  "rfq.approve",
  "rfq.reject",
  "rfq.assign",
  "rfq.export",
  "rfq.financials.view",
  "rfq.commission.manage",
  "marketing.dashboard.view",
  "marketing.seo.view",
  "marketing.seo.edit",
  "marketing.seo.publish",
  "marketing.content.view",
  "marketing.content.edit",
  "marketing.content.publish",
  "marketing.content.delete",
  "marketing.media.manage",
  "marketing.redirects.manage",
  "marketing.analytics.view",
  "combos.view",
  "combos.create",
  "combos.edit",
  "combos.approve",
  "combos.publish",
  "combos.pause",
  "combos.pricing.manage",
  "combos.profit.override",
  "combos.ai.generate",
  "combos.email.manage",
  "combos.slider.manage",
  "combos.reports.view",
  "combos.automation.manage",
  "documents.download",
  "documents.send",
  "documents.history.view",
  "documents.resend",
  "documents.bulk.download",
  "documents.templates.manage",
  "returns.view",
  "returns.create",
  "returns.review",
  "returns.request-information",
  "returns.assign-technician",
  "returns.inspections.assigned",
  "returns.inspections.perform",
  "returns.inspections.review",
  "returns.repair.approve",
  "returns.replacement.approve",
  "returns.refund.approve",
  "returns.reject",
  "returns.refund.pay",
  "returns.refund.confirm",
  "returns.claims.manage",
  "returns.inventory.classify",
  "returns.resale.create",
  "returns.resale.approve",
  "returns.resale.publish",
  "returns.policy.manage",
  "returns.reasons.manage",
  "returns.financial.view",
  "returns.documents.download",
  "returns.documents.send",
  "transport.view",
  "transport.create",
  "transport.edit",
  "transport.quotation.request",
  "transport.quotation.record",
  "transport.quotation.compare",
  "transport.approve",
  "transport.assign",
  "transport.collection.confirm",
  "transport.delivery.confirm",
  "transport.expense.record",
  "transport.invoice.upload",
  "transport.expense.approve",
  "transport.payment.create",
  "transport.payment.confirm",
  "transport.reimbursement.submit",
  "transport.reimbursement.approve",
  "transport.cost.allocate",
  "transport.profitability.view",
  "transport.documents.download",
  "transport.documents.send",
  "transport.providers.manage",
  "transport.settings.manage",
  "transport.reports.view",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

const manuallyAssignedPermissions = new Set<string>(PARTNER_SALES_PERMISSIONS);
const broadAutoManagedRoleSlugs = new Set<string>(
  BROAD_AUTO_MANAGED_ROLE_SLUGS,
);

export function isAutomaticallyGrantedPermission(permission: PermissionKey) {
  return !manuallyAssignedPermissions.has(permission);
}

export function shouldRemoveAutoManagedPartnerSalesGrant(
  roleSlug: string,
  permission: string,
) {
  return (
    broadAutoManagedRoleSlugs.has(roleSlug) &&
    manuallyAssignedPermissions.has(permission)
  );
}

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
