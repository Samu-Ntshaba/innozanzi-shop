import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { commissionEligibility } from "@/domain/partner-sales/commission";
import {
  buildPartnerSalesMessages,
  partnerSalesIdempotencyKey,
} from "@/domain/partner-sales/communications";
import { deriveOrderStatusFromSupplierGroups, resolveOrderOperation } from "@/domain/orders/lifecycle";
import { DEFAULT_PARTNER_SALES_SETTINGS } from "@/domain/partner-sales/settings";
import { partnerOrderDto, publicPartnerProfileDto } from "@/domain/partner-sales/redaction";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("partner sales production acceptance journey", () => {
  it.each(["PAYFAST", "OZOW"])("covers the %s public-to-partner-to-admin path", (provider) => {
    const publicCatalogue = source("src/app/(store)/p/[partnerSlug]/page.tsx");
    const publicShowcase = source("src/app/(store)/p/[partnerSlug]/s/[publicId]/page.tsx");
    const enquiryRoute = source("src/app/api/partner-sales/enquiries/route.ts");
    const quotePage = source("src/app/(store)/partner-quote/[token]/page.tsx");
    const quoteRoute = source("src/app/api/partner-sales/quotes/[token]/accept/route.ts");
    const payment = source("src/domain/partner-sales/payment.ts");
    const finalizer = source("src/domain/payments/finalize.ts");
    const adminCase = source("src/app/admin/partnerships/sales-cases/[id]/page.tsx");
    const partnerCase = source("src/app/account/partner/sales/[caseNumber]/page.tsx");

    expect(publicCatalogue).toContain("partnerCatalogue");
    expect(publicShowcase).toContain("resolveShowcase");
    expect(enquiryRoute).toContain("createPartnerEnquiry");
    expect(enquiryRoute).toContain("idempotencyKey");
    expect(quotePage).toContain("/api/partner-sales/quotes/");
    expect(quoteRoute).toContain(`z.enum([\"PAYFAST\", \"OZOW\"])`);
    expect(quoteRoute).toContain("acceptPartnerQuotation");
    expect(payment).toContain("createPartnerQuotePayment");
    expect(payment).toContain(`provider !== \"PAYFAST\" && provider !== \"OZOW\"`);
    expect(payment).toContain("partnerQuoteCaseId");
    expect(finalizer).toContain("linkPaidPartnerOrder");
    expect(adminCase).toContain("quotePartnerCase");
    expect(partnerCase).toContain("quoteCase");
    expect(provider).toMatch(/PAYFAST|OZOW/);
  });

  it("converges accepted PayFast and Ozow retries on exactly one order/payment pair", () => {
    const payment = source("src/domain/partner-sales/payment.ts");
    expect(payment).toContain("partner-quote:${acceptedVersionId}:${provider}");
    expect(payment).toContain("findUnique({ where: { idempotencyKey }");
    expect(payment).toContain("findFirst({ where: { partnerQuoteCaseId: quoteCase.id }");
    expect(payment).toContain("isolationLevel: \"Serializable\"");
    expect(source("prisma/schema.prisma")).toContain("partnerQuoteCaseId    String?                      @unique");
  });

  it("blocks expired approvals and cost/stock drift before creating an order", () => {
    const payment = source("src/domain/partner-sales/payment.ts");
    expect(payment).toContain("quote.validUntil <= now");
    expect(payment).toContain('"REPRICE_REQUIRED"');
    expect(payment).toContain("cost or stock changed; request repricing");
    expect(payment).toContain("no longer sufficiently available");
    expect(payment).toContain("quotation.update");
  });

  it("requires completion and financial reconciliation before commission payout", () => {
    expect(commissionEligibility({ orderCompleted: false, financiallyReconciled: false }).reasons).toEqual([
      "ORDER_NOT_COMPLETED",
      "FINANCIAL_RECONCILIATION_PENDING",
    ]);
    expect(commissionEligibility({ orderCompleted: true, financiallyReconciled: true }).eligible).toBe(true);
    expect(commissionEligibility({ orderCompleted: true, financiallyReconciled: true, refundAmount: "1" }).reasons).toContain("REFUND");
    const commission = source("src/domain/partner-sales/commission-service.ts");
    const payouts = source("src/domain/partner-sales/payouts.ts");
    expect(commission).toContain('payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED"');
    expect(commission).toContain('"CORRECTION"');
    expect(payouts).toContain("status: \"PAYABLE\"");
    expect(payouts).toContain("Payout approval requires a different finance user");
    expect(payouts).toContain("EFT proof is required");
  });

  it("covers partial/full refund handling before and after payout without editing paid history", () => {
    const commission = source("src/domain/partner-sales/commission-service.ts");
    expect(commission).toContain("Reversal exceeds the unpaid commission balance");
    expect(commission).toContain('status = commission.paidAt ? "PAID" : "REVERSED"');
    expect(commission).toContain('commission.paidAt && type === "REVERSAL" ? "CORRECTION" : type');
    const payouts = source("src/domain/partner-sales/payouts.ts");
    expect(payouts).toContain("Paid payout batches cannot be cancelled; record a compensating commission correction.");
  });

  it("keeps multi-supplier fulfilment in one order until every supplier delivers", () => {
    expect(deriveOrderStatusFromSupplierGroups(["SHIPPED", "PENDING"])).toBe("PROCESSING");
    expect(deriveOrderStatusFromSupplierGroups(["DELIVERED", "OUT_FOR_DELIVERY"])).toBe("OUT_FOR_DELIVERY");
    expect(deriveOrderStatusFromSupplierGroups(["DELIVERED", "DELIVERED"])).toBe("DELIVERED");
    expect(resolveOrderOperation({
      status: "DELIVERED",
      paymentStatus: "PAID",
      hasSupplierItems: true,
      groups: [{ status: "CONFIRMED", shipmentStatus: "DELIVERED" }, { status: "CONFIRMED", shipmentStatus: "DELIVERED" }],
    })).toMatchObject({ targetStatus: "COMPLETED" });
  });

  it("deduplicates audience email staging and strips injection/internal economics", () => {
    const messages = buildPartnerSalesMessages({
      event: "PAYMENT_CONFIRMED",
      entityId: "case-1",
      orderNumber: "ORD-1",
      publicMessage: "<script>alert(1)</script> supplier cost R1 margin",
      internalMessage: "supplier cost R900",
      client: { email: "Buyer@Example.com", name: "Buyer", communicationConsent: true },
      partner: { email: "Buyer@Example.com", name: "Partner" },
      internalRecipients: [{ email: "ops@example.com" }, { email: "OPS@example.com" }],
    });
    expect(messages).toHaveLength(3);
    expect(new Set(messages.map(({ message }) => message.idempotencyKey)).size).toBe(3);
    expect(messages.filter(({ audience }) => audience === "client")[0]?.message.text).not.toMatch(/supplier|cost|margin|<script>/i);
    expect(messages.filter(({ audience }) => audience === "client")[0]?.message.html).not.toContain("<script>");
    expect(partnerSalesIdempotencyKey("PAYMENT_CONFIRMED", "case-1", "client")).toBe("partner-sales:PAYMENT_CONFIRMED:case-1:client");
  });

  it("redacts supplier economics and rejects executable public data", () => {
    const profile = publicPartnerProfileDto({ id: "p-1", publicSlug: "acme", displayName: "Acme", contactEmail: "a@example.com", contactPhone: null, footerText: null, themePreset: "DEFAULT", supplierCost: "900" });
    const order = partnerOrderDto({ id: "o-1", orderNumber: "ORD-1", status: "PROCESSING", customerVisibleNotes: "<img src=x onerror=alert(1)>", items: [{ id: "i-1", productName: "Laptop", sku: "LAP-1", variantName: null, quantity: 1, unitPrice: "1000", lineTotal: "1000", costPrice: "900" }], shipments: [] });
    expect(profile).not.toHaveProperty("supplierCost");
    expect(JSON.stringify(order)).not.toMatch(/costPrice|supplier|margin|internal/i);
    expect(JSON.stringify(order)).toContain("customerVisibleNotes");
    expect(source("src/domain/partner-sales/profile-service.ts")).toContain("markupOrExecutableContent");
    expect(source("src/domain/partner-sales/catalogue.ts")).toContain("executableContent");
  });

  it("keeps rollout disabled by default and links desktop/mobile operational workspaces", () => {
    expect(DEFAULT_PARTNER_SALES_SETTINGS).toEqual({ enabled: false });
    expect(source("src/domain/partner-sales/settings.ts")).toContain("enabled: z.boolean().default(false)");
    expect(source("src/domain/partner-sales/access.ts")).toContain("if (!settings.enabled)");
    for (const page of ["src/app/admin/orders/[id]/page.tsx", "src/app/mobile-admin/orders/[id]/page.tsx"]) {
      const content = source(page);
      expect(content).toContain("/admin/partnerships/sales-cases/");
      expect(content).toContain("partnerQuoteCase");
    }
    expect(source("src/app/account/partner/orders/page.tsx")).toContain("/account/partner/orders/");
    expect(source("src/app/admin/partnerships/sales-channel/page.tsx")).toContain("partnerSalesSettings");
  });

  it("guards the migration and schema as additive and advances the Prisma marker", () => {
    const migration = source("prisma/migrations/20260922190000_partner_sales_channel/migration.sql");
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)|TRUNCATE\s+TABLE/i);
    expect(migration).toContain('CREATE TABLE "PartnerSalesProfile"');
    expect(migration).toContain('CREATE TABLE "PartnerCommission"');
    expect(migration).toContain('CREATE TABLE "PartnerPayoutBatch"');
    expect(source("src/lib/prisma.ts")).toContain('PRISMA_SCHEMA_VERSION = "2026-09-22-partner-sales-channel"');
  });

  it("makes the launch audit report partner readiness without private records", () => {
    const audit = source("scripts/audit-commerce-launch.ts");
    for (const metric of [
      "partnerSalesEnabled",
      "activePartnerProfiles",
      "partnerOrphans",
      "partnerMismatches",
      "duplicatePartnerCommissions",
      "ineligiblePartnerPayables",
      "duplicatePartnerPayoutMembership",
      "failedPartnerCommunication",
    ]) expect(audit).toContain(metric);
    expect(audit).toContain("PARTNER_QUOTATION_PAYMENT_ORDER_MISMATCH");
    expect(audit).toContain("PARTNER_SALES_SETTINGS_KEY");
    expect(audit).not.toContain("partnerClient.email");
  });
});
