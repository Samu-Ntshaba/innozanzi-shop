export const PARTNERSHIP_STAGE_COUNT = 3;

export function partnershipStage(currentStep: number | null | undefined) {
  return Math.min(PARTNERSHIP_STAGE_COUNT, Math.max(1, currentStep ?? 1));
}
export function missingPartnershipFields(stage: number, data: Record<string, unknown>) {
  const required = stage === 1
    ? ["registeredBusinessName", "registrationNumber", "businessAddress", "representativeName", "representativeRole", "representativePhone"]
    : stage === 2
      ? ["businessProfile", "productCategories", "purchasingFrequency"]
      : [];
  return required.filter(key => {
    const value = data[key];
    return typeof value !== "string" || !value.trim();
  });
}
