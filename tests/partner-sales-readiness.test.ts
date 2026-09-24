import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");

describe("partner sales operational readiness", () => {
  it("keeps the global feature flag and public enquiry controls visible in source", () => {
    expect(source("src/domain/partner-sales/settings.ts")).toContain("partner_sales.channel.v1");
    const route = source("src/app/api/partner-sales/enquiries/route.ts");
    expect(route).toContain("boundedFormData");
    expect(route).toContain("browserMutationGuard");
    expect(route).toContain("clientAddress");
    expect(source("src/domain/partner-sales/enquiries.ts")).toContain("consumeRateLimit");
    expect(source("src/domain/partner-sales/enquiries.ts")).toContain("Communication consent is required");
  });

  it("connects partner navigation to explicit permissions and feature visibility", () => {
    const admin = source("src/components/admin/admin-nav.tsx");
    expect(admin).toContain("/admin/partnerships/sales-channel");
    expect(admin).toContain("partner_sales");
    expect(admin).toContain("partnerSalesEnabled");
    const account = source("src/components/account/account-nav.tsx");
    expect(account).toContain("/account/partner/sales");
    expect(source("src/app/account/layout.tsx")).toContain("partnerSalesSettings");
  });

  it("keeps public exports and partner projections free of internal economics", () => {
    const payout = source("src/domain/partner-sales/payout-pdf.ts");
    expect(payout).toContain("csvCell");
    expect(payout).not.toContain("costPrice");
    const redaction = source("src/domain/partner-sales/redaction.ts");
    expect(redaction).toContain("Partner-facing commission status");
    expect(redaction).not.toContain("supplierCost");
  });
});
