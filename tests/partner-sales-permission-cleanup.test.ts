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

describe("partner sales migration cleanup", () => {
  it("deletes stale broad-role grants after registration without touching custom roles", () => {
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
    const cleanupAt = migration.indexOf(
      "-- Remove stale broad-role grants",
    );
    const settingAt = migration.indexOf(
      "-- The channel remains unavailable",
    );
    const cleanup = migration.slice(cleanupAt, settingAt);

    expect(registrationAt).toBeGreaterThan(-1);
    expect(cleanupAt).toBeGreaterThan(registrationAt);
    expect(settingAt).toBeGreaterThan(cleanupAt);
    expect(cleanup).toContain('DELETE FROM "RolePermission"');
    expect(cleanup).toContain(
      `role."slug" IN ('super-administrator', 'administrator')`,
    );
    expect(cleanup).toContain(
      `permission."key" IN ('partner_sales.profile.approve'`,
    );
    expect(cleanup).not.toContain("custom-administrator");
    expect(cleanup).not.toMatch(/DELETE FROM "RolePermission"\s*;/);
  });
});
