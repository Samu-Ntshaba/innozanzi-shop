import { describe, expect, it } from "vitest";
import { adminNavGroups, adminRoutePermissions } from "@/components/admin/admin-nav";
import { PERMISSIONS } from "@/domain/auth/permissions";

describe("admin navigation permission connections", () => {
  it("maps every non-super-admin route to a real permission", () => {
    const routes = adminNavGroups.flatMap((group) => group.sections.flatMap((section) => section.links.map(([, href]) => href)));
    for (const route of routes) {
      if (route === "/admin/test-mode") continue;
      expect(adminRoutePermissions[route], `${route} needs a permission mapping`).toBeTruthy();
      expect(PERMISSIONS, `${route} references an unknown permission`).toContain(adminRoutePermissions[route]);
    }
  });
});
