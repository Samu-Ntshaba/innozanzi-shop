import { describe, expect, it } from "vitest";
import {
  PARTNER_SALES_PERMISSIONS,
  PERMISSIONS,
} from "@/domain/auth/permissions";
import { PERMISSION_GROUPS } from "@/domain/auth/permission-groups";
import { rolePermissionRulesFromForm } from "@/domain/auth/role-permission-rules";

describe("partner sales access-control rendering", () => {
  it("renders a dedicated Partner Sales group with all six permissions", () => {
    const partnerSales = PERMISSION_GROUPS.find(
      ([label]) => label === "Partner Sales",
    );

    expect(partnerSales?.[1]).toEqual(PARTNER_SALES_PERMISSIONS);
  });

  it("renders every registered permission exactly once so saving cannot drop unseen rules", () => {
    const rendered = PERMISSION_GROUPS.flatMap(([, permissions]) => permissions);

    expect(rendered).toHaveLength(PERMISSIONS.length);
    expect(new Set(rendered).size).toBe(PERMISSIONS.length);
    expect(rendered).toEqual(expect.arrayContaining([...PERMISSIONS]));
  });
});

describe("partner sales permission persistence", () => {
  it("round-trips distinct pricing and payout rules from the access-control form", () => {
    const formData = new FormData();
    formData.set("permission:partner_sales.pricing.approve", "ALLOW");
    formData.set("permission:partner_sales.payout.prepare", "DENY");
    formData.set("permission:partner_sales.payout.approve", "ALLOW");
    formData.set("permission:orders.view", "ALLOW");

    const rules = rolePermissionRulesFromForm(
      "role-1",
      [
        { id: "pricing", key: "partner_sales.pricing.approve" },
        { id: "prepare", key: "partner_sales.payout.prepare" },
        { id: "approve", key: "partner_sales.payout.approve" },
        { id: "orders", key: "orders.view" },
      ],
      formData,
    );

    expect(rules).toEqual([
      { roleId: "role-1", permissionId: "pricing", effect: "ALLOW" },
      { roleId: "role-1", permissionId: "prepare", effect: "DENY" },
      { roleId: "role-1", permissionId: "approve", effect: "ALLOW" },
      { roleId: "role-1", permissionId: "orders", effect: "ALLOW" },
    ]);
  });

  it("omits only permissions explicitly submitted as not granted", () => {
    const formData = new FormData();
    formData.set("permission:partner_sales.pricing.approve", "NONE");
    formData.set("permission:partner_sales.payout.prepare", "ALLOW");

    expect(
      rolePermissionRulesFromForm(
        "role-1",
        [
          { id: "pricing", key: "partner_sales.pricing.approve" },
          { id: "prepare", key: "partner_sales.payout.prepare" },
        ],
        formData,
      ),
    ).toEqual([
      { roleId: "role-1", permissionId: "prepare", effect: "ALLOW" },
    ]);
  });
});
