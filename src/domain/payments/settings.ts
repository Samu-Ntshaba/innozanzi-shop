import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const RETAIL_PAYMENT_SETTINGS_KEY = "payments.retail.v1";
export const retailPaymentSettingsSchema = z.object({
  eftEnabled: z.boolean().default(false),
  bankName: z.string().trim().max(120).default(""),
  accountHolder: z.string().trim().max(160).default(""),
  accountNumber: z.string().trim().max(80).default(""),
  accountType: z.string().trim().max(80).default(""),
  branchCode: z.string().trim().max(40).default(""),
  instructions: z.string().trim().max(1000).default(""),
}).superRefine((value, ctx) => {
  if (!value.eftEnabled) return;
  for (const key of ["bankName", "accountHolder", "accountNumber", "branchCode"] as const) {
    if (!value[key]) ctx.addIssue({ code: "custom", path: [key], message: "Required when EFT is enabled." });
  }
});

export type RetailPaymentSettings = z.infer<typeof retailPaymentSettingsSchema>;
export const DEFAULT_RETAIL_PAYMENT_SETTINGS = retailPaymentSettingsSchema.parse({});

export async function getRetailPaymentSettings(): Promise<RetailPaymentSettings> {
  const row = await prisma.siteSetting.findUnique({ where: { key: RETAIL_PAYMENT_SETTINGS_KEY } });
  const parsed = retailPaymentSettingsSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : DEFAULT_RETAIL_PAYMENT_SETTINGS;
}

export function eftConfigured(settings: RetailPaymentSettings) {
  return settings.eftEnabled && Boolean(settings.bankName && settings.accountHolder && settings.accountNumber && settings.branchCode);
}
