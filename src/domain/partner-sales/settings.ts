import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const PARTNER_SALES_SETTINGS_KEY = "partner_sales.channel.v1";

export const partnerSalesSettingsSchema = z.object({
  enabled: z.boolean().default(false),
});

export type PartnerSalesSettings = z.infer<typeof partnerSalesSettingsSchema>;

export const DEFAULT_PARTNER_SALES_SETTINGS: PartnerSalesSettings =
  Object.freeze(partnerSalesSettingsSchema.parse({}));

export async function partnerSalesSettings(): Promise<PartnerSalesSettings> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: PARTNER_SALES_SETTINGS_KEY },
    select: { value: true },
  });
  const parsed = partnerSalesSettingsSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : DEFAULT_PARTNER_SALES_SETTINGS;
}
