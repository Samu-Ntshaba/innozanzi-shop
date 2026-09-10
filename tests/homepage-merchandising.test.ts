import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage premium merchandising", () => {
  const page = readFileSync("src/app/(store)/page.tsx", "utf8");
  const showcase = readFileSync("src/components/store/homepage-feature-grid.tsx", "utf8");
  const catalogue = readFileSync("src/domain/catalogue/queries.ts", "utf8");

  it("shows real flagship products before recommendations and promotions", () => {
    expect(page.indexOf("HomepageFeatureGrid")).toBeLessThan(page.indexOf("RecommendationSection recommendations"));
    expect(page.indexOf("RecommendationSection recommendations")).toBeLessThan(page.indexOf("catalogue.promotions.length"));
    expect(showcase).toContain("lead.name");
    expect(showcase).toContain("leadImage.path");
    expect(showcase).toContain("formatZar(leadPrice)");
    expect(showcase).not.toContain("Technology worth getting excited about.");
    expect(showcase).not.toContain("Start with the machines and displays");
  });

  it("selects a diverse, sellable premium showcase from live catalogue data", () => {
    expect(catalogue).toContain("premiumShowcase(showcaseCandidates)");
    expect(catalogue).toContain("notebook|laptop");
    expect(catalogue).toContain("gaming desktops|creator workstations|super computer");
    expect(catalogue).toContain("monitor|display");
    expect(catalogue).toContain("costPrice: { gt: 12000 }");
    expect(catalogue).toContain("stock: { gt: 0 }");
  });
});
