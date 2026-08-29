import { describe, expect, it } from "vitest";
import { PC_PROJECT_MINIMUM_PROGRESSIVE_PURCHASE, progressivePurchaseEligibility } from "@/domain/pc-projects/policy";

describe("PC project purchase policy", () => {
  it("uses the central R4,000 progressive-purchase minimum", () => {
    expect(PC_PROJECT_MINIMUM_PROGRESSIVE_PURCHASE).toBe(4_000);
  });

  it("returns the exact shortfall below the minimum", () => {
    expect(progressivePurchaseEligibility(2_750)).toEqual({ eligible: false, shortfall: 1_250 });
  });

  it("accepts the boundary and higher totals", () => {
    expect(progressivePurchaseEligibility(4_000).eligible).toBe(true);
    expect(progressivePurchaseEligibility(8_500).eligible).toBe(true);
  });
});
