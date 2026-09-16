import { describe, expect, it } from "vitest";
import { adminNavGroups, adminRoutePermissions } from "@/components/admin/admin-nav";
import { PERMISSIONS } from "@/domain/auth/permissions";

describe("admin navigation permission connections", () => {
  it("exposes the complete Pricing & Trading workspace", () => {
    const group = adminNavGroups.find((item) => item.label === "Pricing & Trading");
    const routes = group?.sections.flatMap((section) => section.links.map(([, href]) => href));
    expect(routes).toEqual([
      "/admin/pricing-trading",
      "/admin/pricing",
      "/admin/trading",
      "/admin/trading/market",
      "/admin/promotions",
      "/admin/trading/sessions",
      "/admin/trading/rules",
      "/admin/trading/history",
    ]);
    expect(PERMISSIONS).toEqual(expect.arrayContaining([
      "trading.view",
      "trading.market.manage",
      "trading.rules.manage",
      "trading.decisions.manage",
      "trading.audit.view",
    ]));
  });
  it("does not expose Innozanzi-operated fulfilment, delivery, or logistics navigation", () => {
    const groups = adminNavGroups.map((group) => group.label);
    const routes = adminNavGroups.flatMap((group) => group.sections.flatMap((section) => section.links.map(([, href]) => href)));
    expect(groups).not.toContain("Fulfilment");
    expect(routes).not.toContain("/admin/logistics");
    expect(routes).not.toContain("/admin/delivery-notes");
    expect(routes).toContain("/admin/orders");
    expect(routes).toContain("/admin/returns");
  });
  it("maps every non-super-admin route to a real permission", () => {
    const routes = adminNavGroups.flatMap((group) => group.sections.flatMap((section) => section.links.map(([, href]) => href)));
    for (const route of routes) {
      if (route === "/admin/test-mode") continue;
      expect(adminRoutePermissions[route], `${route} needs a permission mapping`).toBeTruthy();
      expect(PERMISSIONS, `${route} references an unknown permission`).toContain(adminRoutePermissions[route]);
    }
  });
});
