type UnknownRecord = Record<string, unknown>;

export type PublicPartnerProfileProjection = {
  id: string;
  publicSlug: string;
  displayName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  footerText: string | null;
  themePreset: string;
};

export type PublicShowcaseItemProjection = {
  id: string;
  titleSnapshot: string;
  presentationCopySnapshot: string | null;
  mediaSnapshot: unknown;
};

export type PublicShowcaseProjection = {
  publicId: string;
  title: string;
  introduction: string | null;
  items: readonly PublicShowcaseItemProjection[];
};

export type PartnerOrderItemProjection = {
  id: string;
  productName: string;
  sku: string;
  variantName: string | null;
  quantity: number;
  unitPrice: unknown;
  lineTotal: unknown;
};

export type PartnerShipmentProjection = {
  id: string;
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  estimatedDeliveryAt?: Date | null;
};

export type PartnerOrderProjection = {
  id: string;
  orderNumber: string;
  status: string;
  customerVisibleNotes?: string | null;
  items: readonly PartnerOrderItemProjection[];
  shipments: readonly PartnerShipmentProjection[];
};

export type PublicPartnerProfileDto = {
  id: string | null;
  publicSlug: string | null;
  displayName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  footerText: string | null;
  themePreset: string | null;
};
export type PublicShowcaseDto = {
  publicId: string | null;
  title: string | null;
  introduction: string | null;
  items: Array<{ id: string | null; title: string | null; presentationCopy: string | null; media: Array<{ url: string | null; altText: string | null }> }>;
};
export type PartnerOrderDto = {
  id: string | null;
  orderNumber: string | null;
  status: string | null;
  customerVisibleNotes: string | null;
  items: Array<{ id: string | null; productName: string | null; sku: string | null; variantName: string | null; quantity: number | null; unitPrice: string | null; lineTotal: string | null }>;
  shipments: Array<{ id: string | null; status: string | null; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; estimatedDeliveryAt: string | null }>;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function records(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function moneyOrNull(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (value && typeof value === "object" && "toString" in value && typeof value.toString === "function") return value.toString();
  return null;
}

function isoDateOrNull(value: unknown) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : null;
}

function mediaDto(value: unknown) {
  return records(value).map((media) => ({ url: stringOrNull(media.url), altText: stringOrNull(media.altText) }));
}

/** Public catalogue identity from a PartnerSalesProfile selection. */
export function publicPartnerProfileDto(input: PublicPartnerProfileProjection): PublicPartnerProfileDto;
export function publicPartnerProfileDto(input: unknown): PublicPartnerProfileDto;
export function publicPartnerProfileDto(input: unknown): PublicPartnerProfileDto {
  const profile = isRecord(input) ? input : {};
  return {
    id: stringOrNull(profile.id),
    publicSlug: stringOrNull(profile.publicSlug),
    displayName: stringOrNull(profile.displayName),
    contactEmail: stringOrNull(profile.contactEmail),
    contactPhone: stringOrNull(profile.contactPhone),
    footerText: stringOrNull(profile.footerText),
    themePreset: stringOrNull(profile.themePreset),
  };
}

/** Public showcase content from PartnerShowcase and PartnerShowcaseItem snapshot selections. */
export function publicShowcaseDto(input: PublicShowcaseProjection): PublicShowcaseDto;
export function publicShowcaseDto(input: unknown): PublicShowcaseDto;
export function publicShowcaseDto(input: unknown): PublicShowcaseDto {
  const showcase = isRecord(input) ? input : {};
  return {
    publicId: stringOrNull(showcase.publicId),
    title: stringOrNull(showcase.title),
    introduction: stringOrNull(showcase.introduction),
    items: records(showcase.items).map((item) => ({
      id: stringOrNull(item.id),
      title: stringOrNull(item.titleSnapshot),
      presentationCopy: stringOrNull(item.presentationCopySnapshot),
      media: mediaDto(item.mediaSnapshot),
    })),
  };
}

/** Partner-facing order progress from Order, OrderItem, and Shipment selections. */
export function partnerOrderDto(input: PartnerOrderProjection): PartnerOrderDto;
export function partnerOrderDto(input: unknown): PartnerOrderDto;
export function partnerOrderDto(input: unknown): PartnerOrderDto {
  const order = isRecord(input) ? input : {};
  return {
    id: stringOrNull(order.id),
    orderNumber: stringOrNull(order.orderNumber),
    status: stringOrNull(order.status),
    customerVisibleNotes: stringOrNull(order.customerVisibleNotes),
    items: records(order.items).map((item) => ({
      id: stringOrNull(item.id),
      productName: stringOrNull(item.productName),
      sku: stringOrNull(item.sku),
      variantName: stringOrNull(item.variantName),
      quantity: numberOrNull(item.quantity),
      unitPrice: moneyOrNull(item.unitPrice),
      lineTotal: moneyOrNull(item.lineTotal),
    })),
    shipments: records(order.shipments).map((shipment) => ({
      id: stringOrNull(shipment.id),
      status: stringOrNull(shipment.status),
      carrier: stringOrNull(shipment.carrier),
      trackingNumber: stringOrNull(shipment.trackingNumber),
      trackingUrl: stringOrNull(shipment.trackingUrl),
      estimatedDeliveryAt: isoDateOrNull(shipment.estimatedDeliveryAt),
    })),
  };
}

/** Partner-facing commission status, excluding internal calculation snapshots and financial evidence. */
export function partnerCommissionDto(input: UnknownRecord) {
  return {
    id: stringOrNull(input.id),
    status: stringOrNull(input.status),
    method: stringOrNull(input.method),
    currentAmount: moneyOrNull(input.currentAmount),
    quotedAmount: moneyOrNull(input.quotedAmount),
    currency: stringOrNull(input.currency),
  };
}
