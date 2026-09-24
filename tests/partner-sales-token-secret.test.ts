import { afterEach, describe, expect, it, vi } from "vitest";
import { createPartnerQuotationToken } from "@/domain/partner-sales/documents";

describe("partner quotation signing configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed in production without a configured secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PARTNER_QUOTATION_TOKEN_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => createPartnerQuotationToken("version-1", new Date("2026-09-30T00:00:00Z"))).toThrow(/configure.*secret/i);
  });

  it("does not allow the insecure test flag to bypass production signing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PARTNER_QUOTATION_TOKEN_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("PARTNER_QUOTATION_ALLOW_INSECURE_TEST_SECRET", "true");
    expect(() => createPartnerQuotationToken("version-1", new Date("2026-09-30T00:00:00Z"))).toThrow(/configure.*secret/i);
  });

  it("allows explicit test-environment injection", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PARTNER_QUOTATION_TOKEN_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("PARTNER_QUOTATION_ALLOW_INSECURE_TEST_SECRET", "true");
    expect(createPartnerQuotationToken("version-1", new Date("2026-09-30T00:00:00Z"))).toContain(".");
  });
});
