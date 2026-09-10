import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("grants selected users private product access without admin permissions", () => {
  const session = readFileSync("src/domain/auth/session.ts", "utf8");
  expect(session).toContain('roles.includes("product-tester")');

  for (const file of [
    "src/components/store/catalogue-page.tsx",
    "src/app/(store)/page.tsx",
    "src/app/(store)/products/[slug]/page.tsx",
    "src/domain/cart/actions.ts",
    "src/domain/checkout/actions.ts",
  ]) {
    expect(readFileSync(file, "utf8")).toContain("canAccessTestProducts");
  }

  const mobilePage = readFileSync(
    "src/app/mobile-admin/testers/page.tsx",
    "utf8",
  );
  expect(mobilePage).toContain("setProductTesterAccess");
  expect(mobilePage).toContain("This does not give them admin access.");

  const migration = readFileSync(
    "prisma/migrations/20260910150000_product_tester_access/migration.sql",
    "utf8",
  );
  expect(migration).toContain("'product-tester'");
  expect(migration).not.toContain('INSERT INTO "RolePermission"');
});
