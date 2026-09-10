import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("product review publication", () => {
  const action = readFileSync("src/domain/catalogue/review-actions.ts", "utf8");
  const reviews = readFileSync("src/components/store/product-reviews.tsx", "utf8");
  const catalogue = readFileSync("src/domain/catalogue/queries.ts", "utf8");
  const supplierPage = readFileSync("src/app/(store)/supplier-products/[slug]/page.tsx", "utf8");

  it("requires an authenticated user and publishes valid reviews immediately", () => {
    expect(action).toContain("await requireUser()");
    expect(action).toContain('status: "APPROVED"');
    expect(action).not.toContain('status: "PENDING"');
    expect(action).toContain("products|supplier-products");
  });

  it("keeps the review form private and makes legacy pending reviews visible", () => {
    expect(reviews).toContain("signedIn ? <form");
    expect(reviews).toContain("Only signed-in customers can publish ratings and comments.");
    expect(catalogue).toContain('["APPROVED", "PENDING"]');
    expect(supplierPage).toContain('["APPROVED", "PENDING"]');
  });
});
