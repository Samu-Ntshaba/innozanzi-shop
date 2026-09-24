import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { commercialPdf } from "@/domain/documents/commercial-pdf";
import { defaultDocumentBranding, type DocumentBranding } from "@/domain/documents/branding";

type RecordLike = Record<string, unknown>;

export type PartnerQuotationClientSnapshot = {
  currency?: string;
  partner?: { displayName?: string | null; publicSlug?: string | null; themePreset?: string | null; contactName?: string | null; contactEmail?: string | null; contactPhone?: string | null; footerText?: string | null };
  client?: { companyName?: string | null; contactName?: string | null; email?: string | null; phone?: string | null; vatNumber?: string | null; billingAddress?: unknown; deliveryAddress?: unknown; deliveryInstructions?: string | null };
  terms?: string | null;
  validUntil: string;
  items: Array<{ id: string; title: string; quantity: number; unitPrice: string; vatTotal: string; lineTotal: string }>;
  subtotal: string;
  vatTotal: string;
  deliveryTotal: string;
  discountTotal: string;
  grandTotal: string;
  merchantDisclosure: string;
};

export type PartnerQuotationClientProjection = {
  quotationId: string;
  quotationNumber: string;
  version: number;
  partner: { displayName: string; publicSlug: string | null; themePreset: string };
  client: { companyName: string; contactName: string; email: string };
  snapshot: PartnerQuotationClientSnapshot;
  terms: string | null;
  validUntil: Date;
  accessToken?: string;
};

export type PartnerQuotationPdfInput = {
  quotationNumber: string;
  version: number;
  partner: { displayName: string; publicSlug?: string | null };
  client: { companyName: string; contactName: string; email: string };
  snapshot: PartnerQuotationClientSnapshot;
  terms?: string | null;
  validUntil: Date;
};

const testTokenSecret = randomBytes(32).toString("hex");
function tokenSecret() {
  const configured = process.env.PARTNER_QUOTATION_TOKEN_SECRET ?? process.env.AUTH_SECRET;
  if (configured?.trim()) return configured;
  if (process.env.NODE_ENV === "test" || process.env.PARTNER_QUOTATION_ALLOW_INSECURE_TEST_SECRET === "true") return testTokenSecret;
  throw new Error("Partner quotation token signing is unavailable: configure PARTNER_QUOTATION_TOKEN_SECRET.");
}

function plain(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}

function record(value: unknown): RecordLike {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordLike : {};
}

function money(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value.toFixed(2);
  if (value && typeof value === "object" && "toString" in value && typeof value.toString === "function") return value.toString();
  return "0.00";
}

function snapshotFrom(value: unknown): PartnerQuotationClientSnapshot {
  const source = record(value);
  const items = Array.isArray(source.items) ? source.items : [];
  return {
    currency: plain(source.currency, "ZAR"),
    partner: { displayName: plain(record(source.partner).displayName), publicSlug: plain(record(source.partner).publicSlug) || null, themePreset: plain(record(source.partner).themePreset, "DEFAULT"), contactName: plain(record(source.partner).contactName) || null, contactEmail: plain(record(source.partner).contactEmail) || null, contactPhone: plain(record(source.partner).contactPhone) || null, footerText: plain(record(source.partner).footerText) || null },
    client: record(source.client) as PartnerQuotationClientSnapshot["client"],
    validUntil: plain(source.validUntil),
    items: items.map((item, index) => {
      const line = record(item);
      return {
        id: plain(line.id, `line-${index + 1}`),
        title: plain(line.title, "Quoted item"),
        quantity: typeof line.quantity === "number" && Number.isInteger(line.quantity) && line.quantity > 0 ? line.quantity : 1,
        unitPrice: money(line.unitPrice),
        vatTotal: money(line.vatTotal),
        lineTotal: money(line.lineTotal),
      };
    }),
    subtotal: money(source.subtotal),
    vatTotal: money(source.vatTotal),
    deliveryTotal: money(source.deliveryTotal),
    discountTotal: money(source.discountTotal),
    grandTotal: money(source.grandTotal),
    merchantDisclosure: plain(source.merchantDisclosure, "Quotation issued by Innozanzi. Payment and fulfilment are managed by Innozanzi."),
    terms: plain(source.terms) || null,
  };
}

function approvedClientSnapshot(input: unknown): PartnerQuotationClientSnapshot {
  const row = record(input);
  const version = record(row.version);
  const snapshot = record(row.snapshot ?? version.snapshot);
  const audience = record(snapshot.audience);
  return snapshotFrom(audience.client ?? row.clientSnapshot ?? snapshot);
}

/** Return only the approved client audience from an immutable quotation version. */
export function clientQuotationProjection(input: unknown): PartnerQuotationClientProjection {
  const row = record(input);
  const version = record(row.version);
  const quotation = record(row.quotation ?? input);
  const snapshot = approvedClientSnapshot(input);
  const snapshotPartner = snapshot.partner ?? {};
  const snapshotClient = snapshot.client ?? {};
  const validUntil = new Date(snapshot.validUntil || plain(quotation.validUntil));
  return {
    quotationId: plain(quotation.id, plain(row.quotationId)),
    quotationNumber: plain(quotation.quotationNumber, "Quotation"),
    version: typeof row.version === "number" ? row.version : typeof version.version === "number" ? version.version : typeof quotation.version === "number" ? quotation.version : 1,
    partner: {
      displayName: plain(snapshotPartner.displayName, "Partner"),
      publicSlug: plain(snapshotPartner.publicSlug) || null,
      themePreset: plain(snapshotPartner.themePreset, "DEFAULT"),
    },
    client: {
      companyName: plain(snapshotClient.companyName, "Client"),
      contactName: plain(snapshotClient.contactName, "Client"),
      email: plain(snapshotClient.email),
    },
    snapshot,
    terms: snapshot.terms == null ? null : plain(snapshot.terms),
    validUntil,
  };
}

/** Internal/Admin document projection. This may include the approved economics but never mutable live values. */
export function internalQuotationProjection(input: unknown) {
  const row = record(input);
  const snapshot = record(row.snapshot);
  const audience = record(snapshot.audience);
  const internal = record(audience.internal);
  return {
    ...clientQuotationProjection(input),
    ...internal,
    internal,
  };
}

function signedPayload(versionId: string, expiresAt: Date) {
  return Buffer.from(`${versionId}.${expiresAt.getTime()}`, "utf8").toString("base64url");
}

function signature(payload: string) {
  return createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
}

export function createPartnerQuotationToken(versionId: string, expiresAt: Date) {
  const payload = signedPayload(versionId, expiresAt);
  return `${payload}.${expiresAt.getTime()}.${signature(payload)}`;
}

export function verifyPartnerQuotationToken(token: string, now = new Date()) {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[0] || !/^\d+$/.test(parts[1]) || !parts[2]) return null;
  const [payload, expiryText, provided] = parts;
  let expected: string;
  try { expected = signature(payload); } catch { return null; }
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) return null;
  const expiry = Number(expiryText);
  if (!Number.isSafeInteger(expiry) || expiry <= now.getTime()) return null;
  let decoded: string;
  try { decoded = Buffer.from(payload, "base64url").toString("utf8"); } catch { return null; }
  const [versionId, encodedExpiry] = decoded.split(".");
  if (!versionId || encodedExpiry !== expiryText) return null;
  return { versionId, expiresAt: new Date(expiry) };
}

function documentBranding(partnerName: string): DocumentBranding {
  return {
    ...defaultDocumentBranding,
    companyName: `Innozanzi · ${plain(partnerName, "Approved partner")}`,
    tagline: "Approved partner quotation",
  };
}

/** Render a client-safe PDF from the immutable client snapshot only. */
export function renderPartnerQuotationPdf(input: PartnerQuotationPdfInput, audience: "client" | "internal" = "client") {
  const rawSnapshot = record(input.snapshot);
  const internal = record(record(rawSnapshot.audience).internal);
  const snapshot = snapshotFrom(audience === "internal" && Object.keys(internal).length ? {
    ...internal,
    items: Array.isArray(internal.items) ? internal.items.map((item) => {
      const line = record(item);
      return { ...line, unitPrice: line.approvedGrossUnit ?? line.unitPrice, lineTotal: line.lineTotal };
    }) : [],
    grandTotal: record(internal.totals).grandTotal ?? rawSnapshot.grandTotal,
    subtotal: record(internal.totals).subtotal ?? rawSnapshot.subtotal,
    vatTotal: record(internal.totals).vatTotal ?? rawSnapshot.vatTotal,
    deliveryTotal: rawSnapshot.deliveryTotal,
    merchantDisclosure: rawSnapshot.merchantDisclosure,
  } : input.snapshot);
  const notes = [
    snapshot.merchantDisclosure,
    input.terms ? plain(input.terms) : null,
    audience === "client" ? "Please accept this exact quotation before payment. Payment is received and fulfilment is managed by Innozanzi." : "Internal review copy — approved commercial inputs remain restricted to authorised staff.",
  ].filter(Boolean).join("\n\n");
  return commercialPdf({
    title: audience === "client" ? `${plain(input.partner.displayName)} · CLIENT QUOTATION` : `${plain(input.partner.displayName)} · INTERNAL QUOTATION`,
    number: `${plain(input.quotationNumber)} · v${input.version}`,
    customer: plain(input.client.companyName || input.client.contactName, "Client"),
    email: plain(input.client.email),
    issueDate: new Date(),
    dueDate: input.validUntil,
    lines: snapshot.items.map((item) => ({ description: item.title, quantity: item.quantity, unitPrice: `R ${item.unitPrice}`, total: `R ${item.lineTotal}` })),
    subtotal: `R ${snapshot.subtotal}`,
    vat: `R ${snapshot.vatTotal}`,
    total: `R ${snapshot.grandTotal}`,
    notes,
  }, documentBranding(input.partner.displayName));
}

export function clientQuotationEmailHtml(projection: PartnerQuotationClientProjection, link: string) {
  const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const name = plain(projection.client.contactName, "there");
  const partner = plain(projection.partner.displayName, "your partner");
  const safeLink = encodeURI(link).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<p>Hello ${escapeHtml(name)},</p><p>${escapeHtml(partner)} has shared an approved quotation issued by Innozanzi.</p><p><strong>Total:</strong> R ${escapeHtml(plain(projection.snapshot.grandTotal))}</p><p><a href="${safeLink}">Review and accept quotation</a></p><p>${escapeHtml(plain(projection.snapshot.merchantDisclosure))}</p>`;
}
