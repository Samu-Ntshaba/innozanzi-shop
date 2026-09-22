import { describe, expect, it } from "vitest";
import {
  isAutomaticallyGrantedPermission,
  PARTNER_SALES_PERMISSIONS,
  PERMISSIONS,
} from "@/domain/auth/permissions";

describe("partner sales permission provisioning", () => {
  it("registers every partner sales permission without making any auto-grantable", () => {
    expect(PARTNER_SALES_PERMISSIONS).toEqual([
      "partner_sales.profile.approve",
      "partner_sales.catalogue.manage",
      "partner_sales.pricing.approve",
      "partner_sales.commission.manage",
      "partner_sales.payout.prepare",
      "partner_sales.payout.approve",
    ]);

    for (const permission of PARTNER_SALES_PERMISSIONS) {
      expect(PERMISSIONS).toContain(permission);
      expect(isAutomaticallyGrantedPermission(permission)).toBe(false);
    }
  });

  it("preserves automatic provisioning eligibility for unrelated permissions", () => {
    expect(isAutomaticallyGrantedPermission("products.view")).toBe(true);
    expect(isAutomaticallyGrantedPermission("orders.update")).toBe(true);
    expect(isAutomaticallyGrantedPermission("partnership.partner.manage")).toBe(
      true,
    );
  });
});
