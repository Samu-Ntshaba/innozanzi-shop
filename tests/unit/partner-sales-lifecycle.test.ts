import { describe, expect, it } from "vitest";
import {
  CASE_TRANSITIONS,
  COMMISSION_TRANSITIONS,
  PROFILE_TRANSITIONS,
  assertCaseTransition,
  assertCommissionTransition,
  assertProfileTransition,
} from "@/domain/partner-sales/lifecycle";

const caseStatuses = Object.keys(CASE_TRANSITIONS) as Array<keyof typeof CASE_TRANSITIONS>;
const profileStatuses = Object.keys(PROFILE_TRANSITIONS) as Array<keyof typeof PROFILE_TRANSITIONS>;
const commissionStatuses = Object.keys(COMMISSION_TRANSITIONS) as Array<keyof typeof COMMISSION_TRANSITIONS>;

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
      for (const target of caseStatuses) expect(() => assertCaseTransition(terminal, target)).toThrow(/cannot move/i);
    }
  });

  it("checks every declared case edge and pins cancellation, dispute, and refund exceptions", () => {
    const expected = {
      NEW_ENQUIRY: ["QUALIFIED", "DECLINED", "CANCELLED"],
      QUALIFIED: ["PRICING_REQUESTED", "DECLINED", "CANCELLED"],
      PRICING_REQUESTED: ["INNOZANZI_REVIEW", "CANCELLED"],
      INNOZANZI_REVIEW: ["PARTNER_REVIEW", "REVISION_REQUESTED", "DECLINED", "CANCELLED"],
      PARTNER_REVIEW: ["SENT_TO_CLIENT", "REVISION_REQUESTED", "DECLINED", "CANCELLED"],
      SENT_TO_CLIENT: ["ACCEPTED", "REVISION_REQUESTED", "DECLINED", "EXPIRED", "CANCELLED"],
      ACCEPTED: ["PAYMENT_PENDING", "CANCELLED"],
      PAYMENT_PENDING: ["PAID", "CANCELLED", "DISPUTED"],
      PAID: ["ORDER_IN_PROGRESS", "REFUNDED", "DISPUTED"],
      ORDER_IN_PROGRESS: ["COMPLETED", "CANCELLED", "REFUNDED", "DISPUTED"],
      COMPLETED: [], REVISION_REQUESTED: ["PRICING_REQUESTED", "DECLINED", "CANCELLED"], DECLINED: [], EXPIRED: [], CANCELLED: [], REFUNDED: [], DISPUTED: [],
    } as const;
    expect(CASE_TRANSITIONS).toEqual(expected);
    for (const [from, targets] of Object.entries(expected)) {
      for (const to of targets) expect(() => assertCaseTransition(from as keyof typeof CASE_TRANSITIONS, to as keyof typeof CASE_TRANSITIONS)).not.toThrow();
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
    for (const target of profileStatuses) expect(() => assertProfileTransition("CLOSED", target)).toThrow(/cannot move/i);
  });

  it("checks every declared profile edge", () => {
    const expected = {
      INVITED: ["PROFILE_INCOMPLETE", "CLOSED"], PROFILE_INCOMPLETE: ["ADMIN_REVIEW", "CLOSED"], ADMIN_REVIEW: ["ACTIVE", "CHANGES_REQUIRED", "SUSPENDED", "CLOSED"], ACTIVE: ["SUSPENDED", "CLOSED"], CHANGES_REQUIRED: ["PROFILE_INCOMPLETE", "ADMIN_REVIEW", "CLOSED"], SUSPENDED: ["ACTIVE", "CLOSED"], CLOSED: [],
    } as const;
    expect(PROFILE_TRANSITIONS).toEqual(expected);
    for (const [from, targets] of Object.entries(expected)) {
      for (const to of targets) expect(() => assertProfileTransition(from as keyof typeof PROFILE_TRANSITIONS, to as keyof typeof PROFILE_TRANSITIONS)).not.toThrow();
    }
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
    for (const terminal of ["PAID", "REVERSED"] as const) {
      for (const target of commissionStatuses) expect(() => assertCommissionTransition(terminal, target)).toThrow(/cannot move/i);
    }
  });

  it("checks every declared commission edge and pins batch reversal", () => {
    const expected = {
      ESTIMATED: ["LOCKED_ON_PAYMENT", "HELD", "ADJUSTED", "REVERSED"], LOCKED_ON_PAYMENT: ["PENDING_COMPLETION", "HELD", "ADJUSTED", "REVERSED"], PENDING_COMPLETION: ["PAYABLE", "HELD", "ADJUSTED", "REVERSED"], PAYABLE: ["HELD", "ADJUSTED", "REVERSED", "INCLUDED_IN_BATCH"], HELD: ["PENDING_COMPLETION", "PAYABLE", "ADJUSTED", "REVERSED"], ADJUSTED: ["PENDING_COMPLETION", "PAYABLE", "HELD", "REVERSED"], REVERSED: [], INCLUDED_IN_BATCH: ["PAID", "HELD", "ADJUSTED", "REVERSED"], PAID: [],
    } as const;
    expect(COMMISSION_TRANSITIONS).toEqual(expected);
    for (const [from, targets] of Object.entries(expected)) {
      for (const to of targets) expect(() => assertCommissionTransition(from as keyof typeof COMMISSION_TRANSITIONS, to as keyof typeof COMMISSION_TRANSITIONS)).not.toThrow();
    }
  });
});
