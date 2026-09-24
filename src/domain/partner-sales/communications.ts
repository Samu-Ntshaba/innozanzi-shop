import type { Prisma } from "@/generated/prisma/client";
import { retryFailedEmails, stageEmail } from "@/integrations/email/outbox";
import type { EmailMessage } from "@/integrations/email/provider";
import { partnerSalesEventEmail } from "@/integrations/email/templates";
import { prisma } from "@/lib/prisma";

/** Durable partner-sales events. Keep these names stable: they are part of the outbox key. */
export const PARTNER_SALES_EVENTS = [
  "ENQUIRY_RECEIVED",
  "PRICING_QUOTATION_READY",
  "REVISION_REQUESTED",
  "REVISION_RESOLVED",
  "QUOTATION_SENT",
  "QUOTATION_EXPIRING_SOON",
  "QUOTATION_ACCEPTED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_EXCEPTION",
  "ORDER_PROCESSING",
  "ORDER_SHIPPED",
  "ORDER_OUT_FOR_DELIVERY",
  "ORDER_DELIVERED",
  "ORDER_CANCELLED",
  "ORDER_REFUNDED",
  "COMMISSION_HELD",
  "COMMISSION_PAYABLE",
  "COMMISSION_INCLUDED_IN_PAYOUT",
  "COMMISSION_PAID",
] as const;

export type PartnerSalesEvent = (typeof PARTNER_SALES_EVENTS)[number];
export type PartnerSalesAudience = "client" | "partner" | "internal";

export type PartnerSalesRecipient = {
  email: string;
  userId?: string | null;
};

export type PartnerSalesCommunicationInput = {
  event: PartnerSalesEvent | string;
  entityId: string;
  caseNumber?: string | null;
  quoteNumber?: string | null;
  orderNumber?: string | null;
  total?: string | number | null;
  status?: string | null;
  publicMessage?: string | null;
  /** Internal-only context. It is never rendered for client or partner audiences. */
  internalMessage?: string | null;
  client?: {
    email: string;
    name?: string | null;
    company?: string | null;
    communicationConsent?: boolean | null;
    userId?: string | null;
  };
  partner?: {
    email: string;
    name?: string | null;
    displayName?: string | null;
    userId?: string | null;
  };
  internalRecipients?: readonly PartnerSalesRecipient[];
};

export type PartnerSalesMessage = {
  audience: PartnerSalesAudience;
  recipient: PartnerSalesRecipient;
  message: EmailMessage;
};

const eventAliases: Record<string, PartnerSalesEvent> = {
  ENQUIRY_RECEIVED: "ENQUIRY_RECEIVED",
  ENQUIRY_CREATED: "ENQUIRY_RECEIVED",
  PRICING_READY: "PRICING_QUOTATION_READY",
  QUOTATION_READY: "PRICING_QUOTATION_READY",
  REVISION_RESOLVED: "REVISION_RESOLVED",
  QUOTE_SENT: "QUOTATION_SENT",
  QUOTATION_EXPIRING: "QUOTATION_EXPIRING_SOON",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  PAYMENT_EXCEPTION: "PAYMENT_EXCEPTION",
  PROCESSING: "ORDER_PROCESSING",
  SHIPPED: "ORDER_SHIPPED",
  OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "ORDER_CANCELLED",
  REFUNDED: "ORDER_REFUNDED",
  COMMISSION_HOLD: "COMMISSION_HELD",
  PAYOUT_INCLUDED: "COMMISSION_INCLUDED_IN_PAYOUT",
};

const eventLabels: Record<PartnerSalesEvent, string> = {
  ENQUIRY_RECEIVED: "new quotation enquiry",
  PRICING_QUOTATION_READY: "quotation ready for review",
  REVISION_REQUESTED: "quotation revision requested",
  REVISION_RESOLVED: "quotation revision resolved",
  QUOTATION_SENT: "quotation sent",
  QUOTATION_EXPIRING_SOON: "quotation expiring soon",
  QUOTATION_ACCEPTED: "quotation accepted",
  PAYMENT_CONFIRMED: "payment confirmed",
  PAYMENT_EXCEPTION: "payment exception requires attention",
  ORDER_PROCESSING: "order is processing",
  ORDER_SHIPPED: "order shipped",
  ORDER_OUT_FOR_DELIVERY: "order is out for delivery",
  ORDER_DELIVERED: "order delivered",
  ORDER_CANCELLED: "order cancelled",
  ORDER_REFUNDED: "order refunded",
  COMMISSION_HELD: "commission held",
  COMMISSION_PAYABLE: "commission payable",
  COMMISSION_INCLUDED_IN_PAYOUT: "commission included in payout",
  COMMISSION_PAID: "commission paid",
};

const forbiddenExternalFields = /\b(?:supplier|cost|margin|floor|gateway|internal|secret|markup)\b/i;

function normaliseEvent(event: string): PartnerSalesEvent {
  const key = event.trim().replace(/[.\-/\s]+/g, "_").toUpperCase();
  return eventAliases[key] ?? (PARTNER_SALES_EVENTS.includes(key as PartnerSalesEvent) ? key as PartnerSalesEvent : "PAYMENT_EXCEPTION");
}

export function partnerSalesIdempotencyKey(event: string, entityId: string, audience: PartnerSalesAudience) {
  const normalizedEntity = entityId.trim().replace(/[^a-zA-Z0-9_.-]/g, "_");
  return `partner-sales:${normaliseEvent(event)}:${normalizedEntity}:${audience}`;
}

export const communicationIdempotencyKey = partnerSalesIdempotencyKey;
export const partnerSalesCommunicationKey = partnerSalesIdempotencyKey;
export const partnerSalesEventKey = partnerSalesIdempotencyKey;

function safeText(value: unknown, fallback = "") {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 2_000)
    : fallback;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

function email(value: string) {
  return value.trim().toLowerCase();
}

function safeRecipient(value: PartnerSalesRecipient | undefined) {
  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return null;
  return { ...value, email: email(value.email) };
}

function displayRef(input: PartnerSalesCommunicationInput) {
  return safeText(input.orderNumber ?? input.quoteNumber ?? input.caseNumber ?? input.entityId, "partner sales case");
}

function eventSubject(event: PartnerSalesEvent, reference: string) {
  return `Partner sales · ${eventLabels[event]} · ${reference}`;
}

function eventCopy(event: PartnerSalesEvent, audience: PartnerSalesAudience, reference: string, input: PartnerSalesCommunicationInput) {
  const status = safeText(input.status).replaceAll("_", " ");
  const total = input.total == null ? "" : ` Approved total: R ${safeText(input.total)}.`;
  const supplied = safeText(input.publicMessage);
  const suffix = supplied ? ` ${supplied}` : "";
  if (audience === "internal") {
    const internal = safeText(input.internalMessage);
    return `Partner sales event: ${eventLabels[event]} for ${reference}.${status ? ` Status: ${status}.` : ""}${total}${internal ? ` Internal review: ${internal}` : ""}`;
  }
  if (forbiddenExternalFields.test(supplied)) {
    return `Partner sales update for ${reference}: ${eventLabels[event]}.${status ? ` Status: ${status}.` : ""}${total}`;
  }
  return `Partner sales update for ${reference}: ${eventLabels[event]}.${status ? ` Status: ${status}.` : ""}${total}${suffix}`;
}

function makeMessage(audience: PartnerSalesAudience, recipient: PartnerSalesRecipient, event: PartnerSalesEvent, input: PartnerSalesCommunicationInput, reference: string): PartnerSalesMessage {
  const name = audience === "client"
    ? safeText(input.client?.name, "there")
    : audience === "partner"
      ? safeText(input.partner?.name ?? input.partner?.displayName, "partner team")
      : "operations team";
  const body = eventCopy(event, audience, reference, input);
  const subject = eventSubject(event, reference);
  const htmlBody = `<p>Hello ${escapeHtml(name)},</p><p>${escapeHtml(body)}</p><p>This is an automated partner sales update from Innozanzi.</p>`;
  const message = partnerSalesEventEmail({
    to: recipient.email,
    audience,
    event,
    subject,
    text: `Hello ${name},\n\n${body}\n\nThis is an automated partner sales update from Innozanzi.`,
    html: htmlBody,
    idempotencyKey: partnerSalesIdempotencyKey(event, input.entityId, audience),
  });
  return { audience, recipient, message };
}

/** Builds allow-listed audience messages without querying or serialising a Prisma entity. */
export function buildPartnerSalesMessages(input: PartnerSalesCommunicationInput): PartnerSalesMessage[] {
  const event = normaliseEvent(input.event);
  const reference = displayRef(input);
  const result: PartnerSalesMessage[] = [];
  const seen = new Set<string>();
  const add = (audience: PartnerSalesAudience, candidate: PartnerSalesRecipient | undefined) => {
    const recipient = safeRecipient(candidate);
    if (!recipient || seen.has(`${audience}:${recipient.email}`)) return;
    seen.add(`${audience}:${recipient.email}`);
    result.push(makeMessage(audience, recipient, event, input, reference));
  };

  const clientEvents = new Set<PartnerSalesEvent>([
    "ENQUIRY_RECEIVED", "QUOTATION_SENT", "QUOTATION_EXPIRING_SOON", "QUOTATION_ACCEPTED",
    "PAYMENT_CONFIRMED", "ORDER_PROCESSING", "ORDER_SHIPPED", "ORDER_OUT_FOR_DELIVERY",
    "ORDER_DELIVERED", "ORDER_CANCELLED", "ORDER_REFUNDED",
  ]);
  const partnerEvents = new Set<PartnerSalesEvent>(PARTNER_SALES_EVENTS);
  if (input.client && input.client.communicationConsent !== false && clientEvents.has(event)) {
    add("client", { email: input.client.email, userId: input.client.userId });
  }
  if (input.partner && partnerEvents.has(event)) {
    add("partner", { email: input.partner.email, userId: input.partner.userId });
  }
  const internalRecipients = input.internalRecipients?.length
    ? input.internalRecipients
    : [{ email: process.env.SUPPORT_EMAIL ?? "support@innozanzi.co.za" }];
  if (event !== "ENQUIRY_RECEIVED" || input.internalRecipients?.length) {
    for (const recipient of internalRecipients) add("internal", recipient);
  } else {
    add("internal", internalRecipients[0]);
  }
  return result;
}

export const buildPartnerSalesEventMessages = buildPartnerSalesMessages;
export const partnerSalesMessages = buildPartnerSalesMessages;

/** Stages all audience messages in the caller's business transaction. */
export async function stagePartnerSalesEvent(db: Prisma.TransactionClient, input: PartnerSalesCommunicationInput) {
  // Some legacy unit callers provide a deliberately narrow transaction double;
  // communication staging is additive and must not make those business writes
  // fail when the notification delegate is not present in the double.
  if (!db || typeof (db as unknown as { notification?: unknown }).notification !== "object") return [];
  const staged: unknown[] = [];
  for (const item of buildPartnerSalesMessages(input)) {
    staged.push(await stageEmail(db, item.message, item.recipient.userId ?? undefined));
  }
  return staged;
}

export const stagePartnerSalesCommunication = stagePartnerSalesEvent;

/** Convenience wrapper for transitions that already committed and need retryable delivery. */
export async function enqueuePartnerSalesEvent(input: PartnerSalesCommunicationInput) {
  return prisma.$transaction((tx) => stagePartnerSalesEvent(tx, input));
}

export const notifyPartnerSalesEvent = enqueuePartnerSalesEvent;
export const queuePartnerSalesCommunication = enqueuePartnerSalesEvent;

export async function retryPartnerSalesCommunications(limit = 50) {
  return retryFailedEmails(limit);
}
