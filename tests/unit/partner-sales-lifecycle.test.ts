import { describe, expect, it } from "vitest";
import {
  assertCaseTransition,
  assertCommissionTransition,
  assertProfileTransition,
} from "@/domain/partner-sales/lifecycle";

describe("partner sales lifecycle policies", () => {
  it("permits every normal quote-case transition", () => {
    const normalTransitions = [
      ["NEW_ENQUIRY", "QUALIFIED"],
      ["QUALIFIED", "PRICING_REQUESTED"],
      ["PRICING_REQUESTED", "INNOZANZI_REVIEW"],
      ["INNOZANZI_REVIEW", "PARTNER_REVIEW"],
      ["PARTNER_REVIEW", "SENT_TO_CLIENT"],
      ["SENT_TO_CLIENT", "ACCEPTED"],
      ["ACCEPTED", "PAYMENT_PENDING"],
      ["PAYMENT_PENDING", "PAID"],
      ["PAID", "ORDER_IN_PROGRESS"],
      ["ORDER_IN_PROGRESS", "COMPLETED"],
    ] as const;

    for (const [from, to] of normalTransitions) {
      expect(() => assertCaseTransition(from, to)).not.toThrow();
    }
  });

  it("permits quote-case revision and commercial exceptions only before terminal closure", () => {
    const exceptionTransitions = [
      ["INNOZANZI_REVIEW", "REVISION_REQUESTED"],
      ["PARTNER_REVIEW", "REVISION_REQUESTED"],
      ["REVISION_REQUESTED", "PRICING_REQUESTED"],
      ["SENT_TO_CLIENT", "DECLINED"],
      ["SENT_TO_CLIENT", "EXPIRED"],
      ["PAYMENT_PENDING", "CANCELLED"],
      ["PAID", "REFUNDED"],
      ["PAID", "DISPUTED"],
    ] as const;

    for (const [from, to] of exceptionTransitions) {
      expect(() => assertCaseTransition(from, to)).not.toThrow();
    }

    for (const terminal of ["COMPLETED", "DECLINED", "EXPIRED", "CANCELLED", "REFUNDED", "DISPUTED"] as const) {
      expect(() => assertCaseTransition(terminal, "QUALIFIED")).toThrow(/cannot move/i);
    }
  });

  it("permits profile onboarding, rework, suspension, and closure without reopening a closed profile", () => {
    const allowedTransitions = [
      ["INVITED", "PROFILE_INCOMPLETE"],
      ["PROFILE_INCOMPLETE", "ADMIN_REVIEW"],
      ["ADMIN_REVIEW", "ACTIVE"],
      ["ADMIN_REVIEW", "CHANGES_REQUIRED"],
      ["CHANGES_REQUIRED", "PROFILE_INCOMPLETE"],
      ["ACTIVE", "SUSPENDED"],
      ["SUSPENDED", "ACTIVE"],
      ["SUSPENDED", "CLOSED"],
    ] as const;

    for (const [from, to] of allowedTransitions) {
      expect(() => assertProfileTransition(from, to)).not.toThrow();
    }
    expect(() => assertProfileTransition("CLOSED", "ACTIVE")).toThrow(/cannot move/i);
  });

  it("permits the commission accrual path and finance exceptions but never advances paid or reversed history", () => {
    const allowedTransitions = [
      ["ESTIMATED", "LOCKED_ON_PAYMENT"],
      ["LOCKED_ON_PAYMENT", "PENDING_COMPLETION"],
      ["PENDING_COMPLETION", "PAYABLE"],
      ["PAYABLE", "INCLUDED_IN_BATCH"],
      ["INCLUDED_IN_BATCH", "PAID"],
      ["PENDING_COMPLETION", "HELD"],
      ["HELD", "PENDING_COMPLETION"],
      ["PAYABLE", "ADJUSTED"],
      ["ADJUSTED", "PAYABLE"],
      ["INCLUDED_IN_BATCH", "REVERSED"],
    ] as const;

    for (const [from, to] of allowedTransitions) {
      expect(() => assertCommissionTransition(from, to)).not.toThrow();
    }
    expect(() => assertCommissionTransition("PAID", "PAYABLE")).toThrow(/cannot move/i);
    expect(() => assertCommissionTransition("REVERSED", "PAYABLE")).toThrow(/cannot move/i);
  });
});
