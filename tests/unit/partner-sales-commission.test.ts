import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { calculatePartnerCommission, commissionEligibility } from "@/domain/partner-sales/commission";

describe("partner commission policies", () => {
  it("calculates percentage commission from the VAT-exclusive sale", () => {
    const commission = calculatePartnerCommission({
      method: "PERCENTAGE",
      value: "12.5",
      netSale: "800",
    });

    expect(commission).toBeInstanceOf(Decimal);
    expect(commission.toString()).toBe("100");
  });

  it("keeps approved fixed-rand commission fixed", () => {
    expect(
      calculatePartnerCommission({ method: "FIXED_AMOUNT", value: "175.25", netSale: "800" }).toString(),
    ).toBe("175.25");
  });

  it("rejects negative and over-sale commission values", () => {
    expect(() => calculatePartnerCommission({ method: "PERCENTAGE", value: "-1", netSale: "800" })).toThrow(/negative/i);
    expect(() => calculatePartnerCommission({ method: "FIXED_AMOUNT", value: "800.01", netSale: "800" })).toThrow(/net sale/i);
    expect(() => calculatePartnerCommission({ method: "PERCENTAGE", value: "100.01", netSale: "800" })).toThrow(/100/i);
  });

  it("rejects non-finite commission calculation inputs", () => {
    expect(() => calculatePartnerCommission({ method: "PERCENTAGE", value: Number.NaN, netSale: "800" })).toThrow(/finite/i);
    expect(() => calculatePartnerCommission({ method: "PERCENTAGE", value: "10", netSale: Number.POSITIVE_INFINITY })).toThrow(/finite/i);
    expect(() => calculatePartnerCommission({ method: "FIXED_AMOUNT", value: "Infinity", netSale: "800" })).toThrow(/finite/i);
  });

  it("holds eligibility when any refund, cancellation, chargeback, dispute, or return remains unresolved", () => {
    const result = commissionEligibility({
      orderCompleted: true,
      financiallyReconciled: true,
      refundAmount: "1",
      hasCancellation: true,
      hasChargeback: true,
      hasDispute: true,
      hasReturnHold: true,
    });

    expect(result).toEqual({
      eligible: false,
      reasons: ["REFUND", "CANCELLATION", "CHARGEBACK", "DISPUTE", "RETURN_HOLD"],
    });
  });

  it("keeps commissions pending until completion and financial reconciliation are both present", () => {
    expect(commissionEligibility({ orderCompleted: false, financiallyReconciled: false })).toEqual({
      eligible: false,
      reasons: ["ORDER_NOT_COMPLETED", "FINANCIAL_RECONCILIATION_PENDING"],
    });
    expect(commissionEligibility({ orderCompleted: true, financiallyReconciled: true })).toEqual({
      eligible: true,
      reasons: [],
    });
  });

  it("rejects non-finite and negative refund amounts", () => {
    expect(() => commissionEligibility({ orderCompleted: true, financiallyReconciled: true, refundAmount: "-0.01" })).toThrow(/negative/i);
    expect(() => commissionEligibility({ orderCompleted: true, financiallyReconciled: true, refundAmount: Number.NaN })).toThrow(/finite/i);
  });
});
