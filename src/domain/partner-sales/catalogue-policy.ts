export const PARTNER_SUPPORTED_CATALOGUE_SOURCE_TYPES = [
  "PRODUCT",
  "SUPPLIER_CATALOGUE_PRODUCT",
  "SUPPLIER",
] as const;

export type PartnerSupportedCatalogueSourceType =
  (typeof PARTNER_SUPPORTED_CATALOGUE_SOURCE_TYPES)[number];

export function isPartnerCatalogueSourceSupported(sourceType: string): sourceType is PartnerSupportedCatalogueSourceType {
  return (PARTNER_SUPPORTED_CATALOGUE_SOURCE_TYPES as readonly string[]).includes(sourceType);
}

export function assertPartnerCatalogueSourceSupported(sourceType: string): asserts sourceType is PartnerSupportedCatalogueSourceType {
  if (!isPartnerCatalogueSourceSupported(sourceType)) {
    throw new Error("Combo and campaign sources are disabled for the partner sales rollout until component inventory and cost checks are live.");
  }
}
