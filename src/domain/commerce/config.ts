import { z } from "zod";
const money=z.coerce.number().min(0).max(1000000),percent=z.coerce.number().min(0).max(50);
export const pricingCostSchema=z.object({
  name:z.string().trim().min(1).max(80),
  description:z.string().max(300).default(""),
  basis:z.enum(["PER_ITEM","PER_ORDER","MONTHLY","PERCENT_NET"]),
  amount:money,
  active:z.boolean().default(true),
});
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
  overheadAllocation:z.enum(["NONE","PER_UNIT"]).default("NONE"),
  expectedMonthlyUnits:z.coerce.number().int().min(1).max(1000000).default(100),
  competitiveAdjustment:z.coerce.number().min(-50).max(100).default(0),
  customCosts:z.array(pricingCostSchema).max(30).default([]),
}).refine(v=>v.accessoryLimit<v.premiumLimit,"Cost bands must be increasing.").superRefine((v,ctx)=>{
 const custom=v.customCosts.filter(c=>c.active&&c.basis==="PERCENT_NET").reduce((sum,c)=>sum+c.amount,0)/100;
 const feeFactor=v.vatRegistered?1:1+v.feeVatPercent/100,output=v.vatRegistered?1+v.vatPercent/100:1;
 const fee=Math.max(v.payfastPercent,v.ozowPercent)/100*feeFactor*output;
 for(const band of ["accessory","hardware","premium"] as const)if(1-v[`${band}Margin`]/100-v.reservePercent/100-custom-fee<=0)ctx.addIssue({code:"custom",path:[`${band}Margin`],message:"Fees, custom costs, reserve and margin leave no viable price."});
});
export type CommerceSettings=z.infer<typeof commerceSchema>;
export const DEFAULT_COMMERCE=commerceSchema.parse({});
