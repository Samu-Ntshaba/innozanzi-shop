type UnknownRecord = Record<string, unknown>;

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function moneyOrNull(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && "toString" in value && typeof value.toString === "function") return value.toString();
  return null;
}

function mediaDto(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const media = entry as UnknownRecord;
    return { url: stringOrNull(media.url), altText: stringOrNull(media.altText) };
  });
}

/** Public catalogue identity, deliberately limited to the channel-approved profile fields. */
export function publicPartnerProfileDto(input: UnknownRecord) {
  return {
    id: stringOrNull(input.id),
    publicSlug: stringOrNull(input.publicSlug),
    displayName: stringOrNull(input.displayName),
    approvedContactEmail: stringOrNull(input.approvedContactEmail),
    approvedContactPhone: stringOrNull(input.approvedContactPhone),
    footerText: stringOrNull(input.footerText),
    theme: stringOrNull(input.theme),
  };
}

/** Public showcase content, with media and item snapshots selected field-by-field. */
export function publicShowcaseDto(input: UnknownRecord) {
  const items = Array.isArray(input.items) ? input.items : [];
  return {
    publicId: stringOrNull(input.publicId),
    title: stringOrNull(input.title),
    introduction: stringOrNull(input.introduction),
    items: items.map((entry) => {
      const item = entry as UnknownRecord;
      return {
        id: stringOrNull(item.id),
        title: stringOrNull(item.title),
        presentationCopy: stringOrNull(item.presentationCopy),
        media: mediaDto(item.media),
      };
    }),
  };
}

/** Partner-facing order progress, excluding customer private notes, supplier data and payment evidence. */
export function partnerOrderDto(input: UnknownRecord) {
  const lineItems = Array.isArray(input.lineItems) ? input.lineItems : [];
  return {
    id: stringOrNull(input.id),
    orderNumber: stringOrNull(input.orderNumber),
    status: stringOrNull(input.status),
    trackingNumber: stringOrNull(input.trackingNumber),
    lineItems: lineItems.map((entry) => {
      const item = entry as UnknownRecord;
      return { title: stringOrNull(item.title), quantity: numberOrNull(item.quantity) };
    }),
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
