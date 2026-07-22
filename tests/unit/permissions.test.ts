import { describe, expect, it } from "vitest";
import { hasPermission } from "../../src/domain/auth/permissions";

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
