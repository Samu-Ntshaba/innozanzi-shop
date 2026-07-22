import { describe, expect, it } from "vitest";
import { hasPermission, isProtectedRoleRemoval } from "../../src/domain/auth/permissions";
import { isSessionUserEligible } from "../../src/domain/auth/rules";

describe("hasPermission", () => {
  it("requires an explicit allow", () => {
    expect(hasPermission([], "products.view")).toBe(false);
    expect(hasPermission([{ key: "products.view", effect: "ALLOW" }], "products.view")).toBe(true);
  });

  it("makes an explicit deny override an allow", () => {
    expect(hasPermission([
      { key: "orders.update", effect: "ALLOW" },
      { key: "orders.update", effect: "DENY" },
    ], "orders.update")).toBe(false);
  });

  it("allows the super administrator bypass", () => {
    expect(hasPermission([], "settings.manage", true)).toBe(true);
  });
});

describe("role assignment protections", () => {
  it("prevents removing the active administrator's own super role", () => {
    expect(isProtectedRoleRemoval("user-1", "user-1", "super-administrator")).toBe(true);
  });

  it("allows other role removals", () => {
    expect(isProtectedRoleRemoval("user-1", "user-2", "super-administrator")).toBe(false);
    expect(isProtectedRoleRemoval("user-1", "user-1", "administrator")).toBe(false);
  });
});

describe("session account eligibility", () => {
  it("rejects suspended, disabled, pending and soft-deleted accounts", () => {
    expect(isSessionUserEligible({ status: "ACTIVE", deletedAt: null })).toBe(true);
    expect(isSessionUserEligible({ status: "SUSPENDED", deletedAt: null })).toBe(false);
    expect(isSessionUserEligible({ status: "DISABLED", deletedAt: null })).toBe(false);
    expect(isSessionUserEligible({ status: "PENDING_VERIFICATION", deletedAt: null })).toBe(false);
    expect(isSessionUserEligible({ status: "ACTIVE", deletedAt: new Date() })).toBe(false);
  });
});
