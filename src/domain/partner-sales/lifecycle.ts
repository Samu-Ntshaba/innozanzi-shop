import type {
  PartnerCommissionStatus,
  PartnerQuoteCaseStatus,
  PartnerSalesProfileStatus,
} from "@/generated/prisma/enums";

export const CASE_TRANSITIONS: Record<PartnerQuoteCaseStatus, readonly PartnerQuoteCaseStatus[]> = {
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
  COMPLETED: [],
  REVISION_REQUESTED: ["PRICING_REQUESTED", "DECLINED", "CANCELLED"],
  DECLINED: [],
  EXPIRED: [],
  CANCELLED: [],
  REFUNDED: [],
  DISPUTED: [],
};

export const PROFILE_TRANSITIONS: Record<PartnerSalesProfileStatus, readonly PartnerSalesProfileStatus[]> = {
  INVITED: ["PROFILE_INCOMPLETE", "CLOSED"],
  PROFILE_INCOMPLETE: ["ADMIN_REVIEW", "CLOSED"],
  ADMIN_REVIEW: ["ACTIVE", "CHANGES_REQUIRED", "SUSPENDED", "CLOSED"],
  ACTIVE: ["SUSPENDED", "CLOSED"],
  CHANGES_REQUIRED: ["PROFILE_INCOMPLETE", "ADMIN_REVIEW", "CLOSED"],
  SUSPENDED: ["ACTIVE", "CLOSED"],
  CLOSED: [],
};

export const COMMISSION_TRANSITIONS: Record<PartnerCommissionStatus, readonly PartnerCommissionStatus[]> = {
  ESTIMATED: ["LOCKED_ON_PAYMENT", "HELD", "ADJUSTED", "REVERSED"],
  LOCKED_ON_PAYMENT: ["PENDING_COMPLETION", "HELD", "ADJUSTED", "REVERSED"],
  PENDING_COMPLETION: ["PAYABLE", "HELD", "ADJUSTED", "REVERSED"],
  PAYABLE: ["HELD", "ADJUSTED", "REVERSED", "INCLUDED_IN_BATCH"],
  HELD: ["PENDING_COMPLETION", "PAYABLE", "ADJUSTED", "REVERSED"],
  ADJUSTED: ["PENDING_COMPLETION", "PAYABLE", "HELD", "REVERSED"],
  REVERSED: [],
  INCLUDED_IN_BATCH: ["PAID", "HELD", "ADJUSTED", "REVERSED"],
  PAID: [],
};

function assertTransition<State extends string>(
  label: string,
  transitions: Record<State, readonly State[]>,
  from: State,
  to: State,
) {
  if (!transitions[from].includes(to)) {
    throw new Error(`${label} cannot move from ${from.replaceAll("_", " ")} to ${to.replaceAll("_", " ")}.`);
  }
}

export function assertCaseTransition(from: PartnerQuoteCaseStatus, to: PartnerQuoteCaseStatus) {
  assertTransition("Partner quote case", CASE_TRANSITIONS, from, to);
}

export function assertProfileTransition(from: PartnerSalesProfileStatus, to: PartnerSalesProfileStatus) {
  assertTransition("Partner sales profile", PROFILE_TRANSITIONS, from, to);
}

export function assertCommissionTransition(from: PartnerCommissionStatus, to: PartnerCommissionStatus) {
  assertTransition("Partner commission", COMMISSION_TRANSITIONS, from, to);
}
