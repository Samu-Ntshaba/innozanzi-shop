import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
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
  it("keeps the historical migration byte-stable and puts rollout forcing in the forward migration", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "prisma/migrations/20260922190000_partner_sales_channel/migration.sql",
      ),
      "utf8",
    );
    expect(createHash("sha256").update(migration).digest("hex")).toBe(
      "8da7d3165cc73fedb9068499c227c985246b106ecbf76741ac926131dd6b671d",
    );
    expect(migration).not.toMatch(/DELETE\s+FROM|UPDATE\s+"PartnerCatalogueAssignment"/i);
    const safeguards = readFileSync(
      resolve(process.cwd(), "prisma/migrations/20260924190000_partner_sales_release_safeguards/migration.sql"),
      "utf8",
    );
    expect(safeguards).toContain("ON CONFLICT (\"key\") DO UPDATE SET");
    expect(safeguards).toContain("{\"enabled\":false}");
    expect(safeguards).not.toMatch(/DROP\s+(TABLE|COLUMN)|DELETE\s+FROM|UPDATE\s+"PartnerCatalogueAssignment"/i);
    expect(readFileSync(resolve(process.cwd(), "scripts/backfill-partner-sales-release.ts"), "utf8")).toContain("deleteMany");
  });
});
