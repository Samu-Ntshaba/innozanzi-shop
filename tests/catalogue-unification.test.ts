import { describe, expect, it } from "vitest";
import { catalogueSearchScore, catalogueSuggestionScore, fairCataloguePage, interleaveCatalogueGroups } from "@/domain/catalogue/search";
import { productHasCapability } from "@/domain/catalogue/taxonomy";

describe("canonical supplier catalogue", () => {
  it("recognises equivalent Syntech and Pinnacle category paths", () => {
    expect(productHasCapability({ categoryPath: "Computers/Notebooks/Business" }, "LAPTOP")).toBe(true);
    expect(productHasCapability({ categoryPath: "Computers/Notebooks" }, "LAPTOP")).toBe(true);
    expect(productHasCapability({ categoryPath: "Computer peripherals/Displays/Monitors" }, "MONITOR")).toBe(true);
    expect(productHasCapability({ categoryPath: "Computer peripherals/Storage/Internal Ssd" }, "STORAGE")).toBe(true);
    expect(productHasCapability({ categoryPath: "Components/Memory" }, "MEMORY")).toBe(true);
    expect(productHasCapability({ name: "15-inch laptop sleeve", categoryPath: "Bags & luggage" }, "LAPTOP")).toBe(false);
    expect(productHasCapability({ name: "Dual monitor arm", categoryPath: "Stands" }, "MONITOR")).toBe(false);
  });

  it("ranks exact identifiers ahead of loose descriptions", () => {
    const exact = catalogueSearchScore({ name: "Business notebook", sku: "ABC-123" }, "ABC-123");
    const loose = catalogueSearchScore({ name: "Notebook sleeve", description: "Compatible with ABC-123" }, "ABC-123");
    expect(exact).toBeGreaterThan(loose);
  });

  it("ranks partial multi-word queries and tolerates a one-character typing error", () => {
    const laptop = { name: "Lenovo ThinkPad 12 Laptop", sku: "LAB-1200", brand: "Lenovo", category: "Computers" };
    expect(catalogueSuggestionScore(laptop, "lap 12")).toBeGreaterThan(catalogueSuggestionScore({ name: "Laptop sleeve", sku: "SL-1" }, "lap 12"));
    expect(catalogueSuggestionScore(laptop, "lab")).toBeGreaterThan(0);
  });

  it("interleaves suppliers without discarding their ranked order", () => {
    const rows = [{ id: "s1", supplier: "S" }, { id: "s2", supplier: "S" }, { id: "p1", supplier: "P" }, { id: "p2", supplier: "P" }];
    expect(interleaveCatalogueGroups(rows, row => row.supplier).map(row => row.id)).toEqual(["s1", "p1", "s2", "p2"]);
  });

  it("paginates uneven supplier groups without loading the whole catalogue", () => {
    const page = fairCataloguePage([{ key: "S", count: 5 }, { key: "P", count: 2 }], 2, 4);
    expect(page.order).toEqual(["S", "P", "S", "S"]);
    expect(page.windows).toEqual([{ key: "S", skip: 1, take: 3 }, { key: "P", skip: 1, take: 1 }]);
  });
});
