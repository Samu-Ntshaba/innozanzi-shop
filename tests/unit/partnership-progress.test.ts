import { describe, expect, it } from "vitest";
import { missingPartnershipFields, partnershipStage } from "../../src/domain/partnerships/progress";

describe("partnership application progress", () => {
  it("maps legacy and invalid progress values into the three visible stages", () => {
    expect(partnershipStage(undefined)).toBe(1);
    expect(partnershipStage(2)).toBe(2);
    expect(partnershipStage(11)).toBe(3);
    expect(partnershipStage(0)).toBe(1);
  });

  it("requires company and representative details before stage two", () => {
    const complete = { registeredBusinessName: "Example", registrationNumber: "2026/1", businessAddress: "Address", representativeName: "Sam", representativeRole: "Director", representativePhone: "0123456789" };
    expect(missingPartnershipFields(1, complete)).toEqual([]);
    expect(missingPartnershipFields(1, { ...complete, businessAddress: "" })).toEqual(["businessAddress"]);
  });

  it("requires a purchasing profile before document review", () => {
    expect(missingPartnershipFields(2, { businessProfile: "Retailer", productCategories: "Laptops", purchasingFrequency: "Monthly" })).toEqual([]);
    expect(missingPartnershipFields(2, { businessProfile: "Retailer" })).toEqual(["productCategories", "purchasingFrequency"]);
  });
});
