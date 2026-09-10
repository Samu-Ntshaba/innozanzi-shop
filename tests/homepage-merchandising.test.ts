import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { homepageShowcaseWindow, premiumShowcase, type HomepageShowcaseCandidate } from "../src/domain/catalogue/homepage-rotation";

describe("homepage premium merchandising", () => {
  const page = readFileSync("src/app/(store)/page.tsx", "utf8");
  const showcase = readFileSync("src/components/store/homepage-feature-grid.tsx", "utf8");
  const catalogue = readFileSync("src/domain/catalogue/queries.ts", "utf8");
  const packageJson = readFileSync("package.json", "utf8");
  const supplierSync = readFileSync("scripts/process-supplier-sync.ts", "utf8");

  it("shows real flagship products before recommendations and promotions", () => {
    expect(page.indexOf("HomepageFeatureGrid")).toBeLessThan(page.indexOf("RecommendationSection recommendations"));
    expect(page.indexOf("RecommendationSection recommendations")).toBeLessThan(page.indexOf("catalogue.promotions.length"));
    expect(showcase).toContain("lead.name");
    expect(showcase).toContain("leadImage.path");
    expect(showcase).toContain("formatZar(leadPrice)");
    expect(showcase).not.toContain("Technology worth getting excited about.");
    expect(showcase).not.toContain("Start with the machines and displays");
    expect(showcase).toContain("lg:hidden");
    expect(showcase).toContain("<ProductCard product={product}");
    expect(showcase).toContain("hidden max-w-7xl");
    expect(showcase).not.toContain("Shop technology by goal");
  });

  it("persists and refreshes a sellable weekly showcase without admin work", () => {
    expect(catalogue).toContain("homepage.showcase.v1");
    expect(catalogue).toContain("resolveHomepageShowcase");
    expect(catalogue).toContain("refreshHomepageShowcase");
    expect(catalogue).toContain("costPrice: { gt: 12000 }");
    expect(catalogue).toContain("stock: { gt: 0 }");
    expect(packageJson).toContain('"automation:homepage"');
    expect(supplierSync).toContain("refreshHomepageShowcase");
  });

  it("holds a selection for one Johannesburg week and rotates it the next", () => {
    const products: HomepageShowcaseCandidate[] = [
      ...Array.from({ length: 5 }, (_, index) => candidate(`laptop-${index}`, `Premium Laptop ${index}`, "Computers/Notebooks/Gaming notebooks", 90_000 - index * 1_000)),
      ...Array.from({ length: 5 }, (_, index) => candidate(`desktop-${index}`, `Creator PC ${index}`, "Computers/Desktop computers/Creator workstations", 100_000 - index * 1_000)),
      ...Array.from({ length: 5 }, (_, index) => candidate(`monitor-${index}`, `Pro Display ${index}`, "Computer peripherals/Monitors", 60_000 - index * 1_000)),
    ];
    const monday = new Date("2026-09-07T10:00:00Z"), sunday = new Date("2026-09-13T10:00:00Z"), nextMonday = new Date("2026-09-14T10:00:00Z");
    expect(homepageShowcaseWindow(monday).key).toBe(homepageShowcaseWindow(sunday).key);
    expect(premiumShowcase(products, monday).map(product => product.id)).toEqual(premiumShowcase(products, sunday).map(product => product.id));
    expect(premiumShowcase(products, nextMonday).map(product => product.id)).not.toEqual(premiumShowcase(products, monday).map(product => product.id));
    expect(premiumShowcase(products, monday)).toHaveLength(3);
  });
});

function candidate(id: string, name: string, categoryPath: string, price: number): HomepageShowcaseCandidate {
  return { id, name, categoryPath, images: ["one", "two", "three"], stock: 5, costPrice: price, recommendedRetail: price, promotionalPrice: null };
}
