export const PC_PROJECT_MINIMUM_PROGRESSIVE_PURCHASE = 4_000;

export function progressivePurchaseEligibility(total: number) {
  return total >= PC_PROJECT_MINIMUM_PROGRESSIVE_PURCHASE
    ? { eligible: true as const, shortfall: 0 }
    : { eligible: false as const, shortfall: PC_PROJECT_MINIMUM_PROGRESSIVE_PURCHASE - total };
}
