import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BROAD_AUTO_MANAGED_ROLE_SLUGS,
  shouldRemoveAutoManagedPartnerSalesGrant,
} from "@/domain/auth/permissions";

describe("persisted partner sales permission cleanup", () => {
  it("removes partner sales grants only from known broad auto-managed roles", () => {
    expect(BROAD_AUTO_MANAGED_ROLE_SLUGS).toEqual([
      "super-administrator",
      "administrator",
    ]);

    const grants = [
      { roleSlug: "super-administrator", permission: "partner_sales.profile.approve" },
      { roleSlug: "administrator", permission: "partner_sales.payout.approve" },
      { roleSlug: "administrator", permission: "orders.view" },
      { roleSlug: "partner-sales-finance", permission: "partner_sales.payout.approve" },
      { roleSlug: "partner-sales-pricing", permission: "partner_sales.pricing.approve" },
    ];

    const retained = grants.filter(
      (grant) =>
        !shouldRemoveAutoManagedPartnerSalesGrant(
          grant.roleSlug,
          grant.permission,
        ),
    );

    expect(retained).toEqual([
      { roleSlug: "administrator", permission: "orders.view" },
      { roleSlug: "partner-sales-finance", permission: "partner_sales.payout.approve" },
      { roleSlug: "partner-sales-pricing", permission: "partner_sales.pricing.approve" },
    ]);
  });

  it("keeps similarly named custom roles outside the cleanup boundary", () => {
    expect(
      shouldRemoveAutoManagedPartnerSalesGrant(
        "custom-administrator",
        "partner_sales.catalogue.manage",
      ),
    ).toBe(false);
    expect(
      shouldRemoveAutoManagedPartnerSalesGrant(
        "sales-channel-admin",
        "partner_sales.commission.manage",
      ),
    ).toBe(false);
  });
});

describe("partner sales migration safety", () => {
  it("keeps broad-role cleanup and supplier media cleanup in an explicit backfill", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "prisma/migrations/20260922190000_partner_sales_channel/migration.sql",
      ),
      "utf8",
    );
    const registrationAt = migration.indexOf(
      "-- Register partner-channel capabilities",
    );
    expect(registrationAt).toBeGreaterThan(-1);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"RolePermission"/i);
    expect(migration).not.toMatch(/UPDATE\s+"PartnerCatalogueAssignment"/i);
    expect(migration).toContain("ON CONFLICT (\"key\") DO UPDATE SET");
    expect(migration).toContain("{\"enabled\":false}");
    expect(readFileSync(resolve(process.cwd(), "scripts/backfill-partner-sales-release.ts"), "utf8")).toContain("deleteMany");
  });
});
