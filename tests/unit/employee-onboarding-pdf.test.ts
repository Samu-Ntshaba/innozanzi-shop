import { describe, expect, it, vi } from "vitest";
import { defaultDocumentBranding } from "@/domain/documents/branding";

vi.mock("@/domain/documents/branding", async (original) => {
  const actual = await original<typeof import("@/domain/documents/branding")>();
  return { ...actual, getDocumentBranding: async () => defaultDocumentBranding };
});

import { employeeOnboardingPdf } from "@/domain/auth/employee-onboarding-pdf";

describe("employee onboarding PDF", () => {
  it("creates a branded PDF containing employee and system guidance", async () => {
    const pdf = await employeeOnboardingPdf({
      name: "New Employee",
      email: "employee@example.com",
      role: "Sales",
      company: "Innozanzi",
      department: "Commercial",
      expiresAt: new Date("2026-08-01T10:00:00Z"),
    });

    expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
    const content = pdf.toString("latin1");
    expect(content).toContain("EMPLOYEE SYSTEM ONBOARDING GUIDE");
    expect(content).toContain("New Employee");
    expect(content).toContain("CUSTOMER CRM");
    expect(content).toContain("LOGISTICS");
    expect(content).toContain("RETURNS & REFUNDS");
  });
});
