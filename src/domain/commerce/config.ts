import { z } from "zod";
const money=z.coerce.number().min(0).max(1000000),percent=z.coerce.number().min(0).max(50);
export const commerceSchema=z.object({
  vatRegistered:z.boolean().default(false),vatPercent:percent.default(15),reservePercent:percent.default(1.5),
  accessoryMargin:percent.default(18),hardwareMargin:percent.default(12),premiumMargin:percent.default(8),
  accessoryMinimum:money.default(120),hardwareMinimum:money.default(350),premiumMinimum:money.default(750),
  accessoryLimit:money.default(1500),premiumLimit:money.default(10000),
  supplierDelivery:money.default(100),surcharge:money.default(0),handling:money.default(0),
  payfastPercent:percent.default(3.2),payfastFixed:money.default(2),payfastMinimum:money.default(0),
  ozowPercent:percent.default(1.5),ozowFixed:money.default(0),ozowMinimum:money.default(1),
  feeVatPercent:percent.default(15),payoutAllocation:money.default(0),
  customerDelivery:money.default(100),freeDeliveryThreshold:money.default(1500),freshnessHours:z.coerce.number().min(1).max(168).default(30),
  platformMonthly:money.default(1000),rounding:z.enum(["CENT","RAND","99"]).default("CENT"),
}).refine(v=>v.accessoryLimit<v.premiumLimit,"Cost bands must be increasing.");
export type CommerceSettings=z.infer<typeof commerceSchema>;
export const DEFAULT_COMMERCE=commerceSchema.parse({});
