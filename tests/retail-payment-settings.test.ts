import { expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { siteSetting: { findUnique: vi.fn() } } }));
import { DEFAULT_RETAIL_PAYMENT_SETTINGS, eftConfigured, retailPaymentSettingsSchema } from "@/domain/payments/settings";

it("keeps EFT disabled until an administrator supplies complete banking details", () => {
  expect(eftConfigured(DEFAULT_RETAIL_PAYMENT_SETTINGS)).toBe(false);
  expect(retailPaymentSettingsSchema.safeParse({ eftEnabled: true }).success).toBe(false);
  const configured = retailPaymentSettingsSchema.parse({ eftEnabled: true, bankName: "Example Bank", accountHolder: "Innozanzi", accountNumber: "123456", branchCode: "000001" });
  expect(eftConfigured(configured)).toBe(true);
});
