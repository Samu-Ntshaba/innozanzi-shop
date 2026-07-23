import { describe, expect, it } from "vitest";
import { calculateRfqPricing, sellingUnitPrice } from "./calculations";

describe("RFQ pricing", () => {
  it("calculates markup without floating-point drift", () => {
    expect(sellingUnitPrice("100", "MARKUP", "25").toString()).toBe("125");
  });

  it("calculates margin from selling price", () => {
    expect(sellingUnitPrice("75", "MARGIN", "25").toString()).toBe("100");
  });

  it("rejects an impossible margin", () => {
    expect(() => sellingUnitPrice("100", "MARGIN", "100")).toThrow("below 100%");
  });

  it("separates product and service cost and deducts commission", () => {
    const result = calculateRfqPricing([
      { quantity: 2, unitCost: 100, pricingMethod: "MARKUP", pricingPercent: 20 },
      { quantity: 1, unitCost: 50, pricingMethod: "MARKUP", pricingPercent: 20, isService: true },
    ], [25], 10);
    expect(result.totalProductCost.toString()).toBe("200");
    expect(result.totalServiceCost.toString()).toBe("50");
    expect(result.totalAdditionalCost.toString()).toBe("25");
    expect(result.sellingBeforeVat.toString()).toBe("300");
    expect(result.expectedProfit.toString()).toBe("15");
  });
});
