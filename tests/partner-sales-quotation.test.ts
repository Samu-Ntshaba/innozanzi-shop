import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = {
  partnership: "11111111-1111-4111-8111-111111111111",
  otherPartnership: "99999999-9999-4999-8999-999999999999",
  profile: "22222222-2222-4222-8222-222222222222",
  case: "33333333-3333-4333-8333-333333333333",
  quotation: "44444444-4444-4444-8444-444444444444",
  version: "55555555-5555-4555-8555-555555555555",
};

const mocks = vi.hoisted(() => {
  const tx = {
    partnerQuoteCase: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    quotation: { findUnique: vi.fn(), update: vi.fn() },
    quotationVersion: { findUnique: vi.fn() },
    quotationStatusHistory: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    ...tx,
    transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    enqueueEmail: vi.fn().mockResolvedValue({ id: "notification-1" }),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks, siteSetting: { findUnique: vi.fn().mockResolvedValue({ value: { enabled: true } }) }, $transaction: mocks.transaction } }));
vi.mock("@/integrations/email/outbox", () => ({ enqueueEmail: mocks.enqueueEmail }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  acceptPartnerQuotation,
  PartnerQuotationError,
  requestPartnerRevision,
  resolveClientQuotation,
  sendPartnerQuotation,
} from "@/domain/partner-sales/partner-review";
import {
  createPartnerQuotationToken,
  internalQuotationProjection,
  renderPartnerQuotationPdf,
} from "@/domain/partner-sales/documents";

const approvedAt = new Date("2026-09-24T08:00:00.000Z");
const validUntil = new Date("2026-09-26T08:00:00.000Z");

const clientSnapshot = {
  currency: "ZAR",
  partner: { displayName: "Acme Partners", publicSlug: "acme" },
  validUntil: validUntil.toISOString(),
  items: [{ id: "line-1", title: "Business laptop", quantity: 2, unitPrice: "1150.00", vatTotal: "300.00", lineTotal: "2300.00" }],
  subtotal: "2000.00",
  vatTotal: "300.00",
  deliveryTotal: "120.00",
  discountTotal: "0.00",
  grandTotal: "2420.00",
  merchantDisclosure: "Quotation issued by Innozanzi on behalf of the partner. Payment and fulfilment are managed by Innozanzi.",
};

const internalSnapshot = {
  ...clientSnapshot,
  supplierCost: "1500.00",
  protectedGrossUnit: "1100.00",
  commissionAmount: "200.00",
  sourceId: "supplier-secret",
};

const versionRecord = {
  id: ids.version,
  quotationId: ids.quotation,
  version: 1,
  kind: "FINAL",
  snapshot: { audience: { client: clientSnapshot, internal: internalSnapshot }, approvedAt: approvedAt.toISOString() },
  quotation: {
    id: ids.quotation,
    quotationNumber: "QUO-PS-1",
    version: 1,
    status: "SENT",
    validUntil,
    grandTotal: "2420.00",
    terms: "Payment is due against this quotation.",
    partnerQuoteCaseId: ids.case,
    partnerSalesProfileId: ids.profile,
    partnerSalesProfile: { displayName: "Acme Partners", publicSlug: "acme", themePreset: "OCEAN" },
    partnerQuoteCase: {
      id: ids.case,
      caseNumber: "PC-PS-1",
      partnershipId: ids.partnership,
      status: "SENT_TO_CLIENT",
      activeQuotationId: ids.quotation,
      acceptedQuotationVersionId: null,
      partnerClient: { companyName: "Client Co", contactName: "Buyer", email: "buyer@example.com" },
    },
  },
};

function reviewCase(overrides: Record<string, unknown> = {}) {
  return {
    id: ids.case,
    caseNumber: "PC-PS-1",
    partnershipId: ids.partnership,
    status: "PARTNER_REVIEW",
    sentAt: null,
    acceptedAt: null,
    activeQuotationId: ids.quotation,
    acceptedQuotationVersionId: null,
    partnerClient: { companyName: "Client Co", contactName: "Buyer", email: "buyer@example.com" },
    activeQuotation: {
      id: ids.quotation,
      quotationNumber: "QUO-PS-1",
      status: "FINAL_APPROVED",
      version: 1,
      validUntil,
      grandTotal: "2420.00",
      terms: "Payment is due against this quotation.",
      versions: [{ id: ids.version, version: 1, snapshot: { audience: { client: clientSnapshot, internal: internalSnapshot } } }],
      partnerSalesProfile: { displayName: "Acme Partners", publicSlug: "acme", themePreset: "OCEAN" },
    },
    ...overrides,
  };
}

describe("partner quotation documents", () => {
  it("creates a signed expiring link and renders safe client PDF content", () => {
    const token = createPartnerQuotationToken(ids.version, validUntil);
    expect(token.split(".")).toHaveLength(3);
    const pdf = renderPartnerQuotationPdf({
      quotationNumber: "QUO-PS-1",
      version: 1,
      partner: { displayName: "Acme <script>alert(1)</script>", publicSlug: "acme" },
      client: { companyName: "Client Co", contactName: "Buyer", email: "buyer@example.com" },
      snapshot: clientSnapshot,
      terms: "Please approve (then pay).",
      validUntil,
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(500);
    expect(pdf.toString("latin1")).not.toContain("supplier-secret");
    expect(pdf.toString("latin1")).not.toContain("<script>");
  });

  it("keeps internal economics out of the client projection", () => {
    const internal = internalQuotationProjection(versionRecord as never);
    expect(internal).toHaveProperty("supplierCost");
    expect(internal).toHaveProperty("commissionAmount");
    expect(clientSnapshot).not.toHaveProperty("supplierCost");
    expect(clientSnapshot).not.toHaveProperty("sourceId");
  });
});

describe("partner review and client acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.partnerQuoteCase.findUnique.mockResolvedValue(reviewCase());
    mocks.partnerQuoteCase.update.mockResolvedValue(reviewCase({ status: "SENT_TO_CLIENT", sentAt: approvedAt }));
    mocks.quotation.update.mockResolvedValue({ ...reviewCase().activeQuotation, status: "SENT" });
    mocks.quotationVersion.findUnique.mockResolvedValue(versionRecord);
    mocks.partnerQuoteCase.updateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects a partner attempting to review another partnership's case", async () => {
    await expect(requestPartnerRevision(ids.case, { user: { id: "partner-1" }, partnershipId: ids.otherPartnership }, "Change quantity")).rejects.toThrow("another partnership");
  });

  it("rejects price fields in partner revision input", async () => {
    await expect(requestPartnerRevision(ids.case, { user: { id: "partner-1" }, partnershipId: ids.partnership }, { note: "Change", unitPrice: 1 } as never)).rejects.toThrow(PartnerQuotationError);
  });

  it("transitions a revision request and sends only the approved version", async () => {
    const actor = { user: { id: "partner-1" }, partnershipId: ids.partnership };
    const revision = await requestPartnerRevision(ids.case, actor, "Please update the delivery timing.");
    expect(revision.status).toBe("REVISION_REQUESTED");
    expect(mocks.partnerQuoteCase.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "REVISION_REQUESTED" }) }));

    mocks.partnerQuoteCase.findUnique.mockResolvedValue(reviewCase());
    const sent = await sendPartnerQuotation(ids.case, actor);
    expect(sent.version).toBe(1);
    expect(sent.accessToken).toEqual(expect.any(String));
    expect(sent.snapshot.grandTotal).toBe("2420.00");
    expect(sent.snapshot.items).toHaveLength(1);
    expect(mocks.enqueueEmail).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining("2420.00"),
      attachments: expect.arrayContaining([expect.objectContaining({ contentType: "application/pdf" })]),
    }), undefined);
    expect(mocks.quotation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SENT" }) }));
  });

  it("resolves expired or revoked links to null", async () => {
    const token = createPartnerQuotationToken(ids.version, validUntil);
    mocks.quotationVersion.findUnique.mockResolvedValue({ ...versionRecord, quotation: { ...versionRecord.quotation, validUntil: new Date("2020-01-01") } });
    await expect(resolveClientQuotation(token, new Date("2026-09-24"))).resolves.toBeNull();
    mocks.quotationVersion.findUnique.mockResolvedValue({ ...versionRecord, quotation: { ...versionRecord.quotation, status: "CANCELLED" } });
    await expect(resolveClientQuotation(token)).resolves.toBeNull();
  });

  it("accepts only the latest approved version and records consent", async () => {
    const token = createPartnerQuotationToken(ids.version, validUntil);
    const accepted = await acceptPartnerQuotation(token, { consent: true, metadata: { userAgent: "test" } }, new Date("2026-09-24"));
    expect(accepted.status).toBe("PAYMENT_PENDING");
    expect(accepted.version).toBe(1);
    expect(mocks.partnerQuoteCase.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PAYMENT_PENDING", acceptedQuotationVersionId: ids.version }) }));
    expect(mocks.quotation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ acceptedVersion: 1, acceptedAmount: expect.anything() }) }));
  });

  it("converges concurrent acceptance attempts to one acceptance", async () => {
    const token = createPartnerQuotationToken(ids.version, validUntil);
    let accepted = false;
    mocks.partnerQuoteCase.findUnique.mockImplementation(async () => ({ ...reviewCase(), status: accepted ? "PAYMENT_PENDING" : "SENT_TO_CLIENT", acceptedQuotationVersionId: accepted ? ids.version : null }));
    mocks.partnerQuoteCase.update.mockImplementation(async ({ data }: { data: { status?: string } }) => { accepted = data.status === "PAYMENT_PENDING"; return reviewCase({ status: data.status, acceptedQuotationVersionId: ids.version }); });
    const results = await Promise.allSettled([
      acceptPartnerQuotation(token, { consent: true }),
      acceptPartnerQuotation(token, { consent: true }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    expect(new Set(results.map((result) => result.status === "fulfilled" ? result.value.acceptanceId : "failed")).size).toBe(1);
  });
});
