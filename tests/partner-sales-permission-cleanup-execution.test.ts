import { describe, expect, it, vi } from "vitest";
import {
  cleanupRepairAdministratorPartnerSalesGrant,
  cleanupSeedAutoManagedPartnerSalesGrants,
  cleanupUpsertSuperAdministratorPartnerSalesGrant,
} from "@/domain/auth/partner-sales-permission-cleanup";

function cleanupClient(...counts: number[]) {
  return {
    client: {
      rolePermission: {
        deleteMany: vi
          .fn()
          .mockImplementation(async () => ({ count: counts.shift() ?? 0 })),
      },
    },
  };
}

describe("seed partner sales permission cleanup", () => {
  it("deletes only partner sales grants for both broad roles and returns the persisted count", async () => {
    const { client } = cleanupClient(3, 2);

    const deleted = await cleanupSeedAutoManagedPartnerSalesGrants(
      client,
      [
        { id: "admin-role", slug: "administrator" },
        { id: "custom-role", slug: "partner-sales-finance" },
        { id: "super-role", slug: "super-administrator" },
      ],
      [
        { id: "profile-permission", key: "partner_sales.profile.approve" },
        { id: "payout-permission", key: "partner_sales.payout.approve" },
        { id: "orders-permission", key: "orders.view" },
      ],
    );

    expect(deleted).toBe(5);
    expect(client.rolePermission.deleteMany).toHaveBeenCalledTimes(2);
    expect(client.rolePermission.deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        roleId: "admin-role",
        permissionId: { in: ["profile-permission", "payout-permission"] },
      },
    });
    expect(client.rolePermission.deleteMany).toHaveBeenNthCalledWith(2, {
      where: {
        roleId: "super-role",
        permissionId: { in: ["profile-permission", "payout-permission"] },
      },
    });
  });
});

describe("administrator repair partner sales permission cleanup", () => {
  it("deletes the exact stale row and returns the delete result count", async () => {
    const { client } = cleanupClient(1);

    const deleted = await cleanupRepairAdministratorPartnerSalesGrant(
      client,
      { id: "admin-role", slug: "administrator" },
      { id: "prepare-permission", key: "partner_sales.payout.prepare" },
    );

    expect(deleted).toBe(1);
    expect(client.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: {
        roleId: "admin-role",
        permissionId: "prepare-permission",
      },
    });
  });
});

describe("super-administrator upsert partner sales permission cleanup", () => {
  it("deletes the exact stale row and returns the delete result count", async () => {
    const { client } = cleanupClient(1);

    const deleted = await cleanupUpsertSuperAdministratorPartnerSalesGrant(
      client,
      { id: "super-role", slug: "super-administrator" },
      { id: "pricing-permission", key: "partner_sales.pricing.approve" },
    );

    expect(deleted).toBe(1);
    expect(client.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: {
        roleId: "super-role",
        permissionId: "pricing-permission",
      },
    });
  });
});
