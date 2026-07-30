import Decimal from "decimal.js";
import { describe,expect,it } from "vitest";
import { calculateComboPricing,validateComboPricing } from "../../src/domain/combos/calculations";
import { assertComboTransition,scheduledComboState } from "../../src/domain/combos/lifecycle";

describe("combo campaign pricing",()=>{
  it("calculates discount, full cost and profit",()=>{
    const result=calculateComboPricing({items:[{quantity:1,normalPrice:1000,cost:700},{quantity:2,normalPrice:200,cost:100}],comboPrice:1200,deliveryCost:50});
    expect(result.normalPrice.toString()).toBe("1400");
    expect(result.discountAmount.toString()).toBe("200");
    expect(result.totalCost.toString()).toBe("950");
    expect(result.grossProfit.toString()).toBe("250");
    expect(result.profitMargin.toDecimalPlaces(2).toString()).toBe("20.83");
  });
  it("blocks loss-making and excessive-discount campaigns",()=>{
    const pricing=calculateComboPricing({items:[{quantity:1,normalPrice:1000,cost:900}],comboPrice:700});
    expect(validateComboPricing(pricing,{minimumProfitAmount:new Decimal(1),minimumProfitMargin:5,maximumDiscountPercent:20})).toHaveLength(3);
  });
});

describe("combo lifecycle",()=>{
  it("activates and expires scheduled campaigns",()=>{
    const start=new Date("2026-01-01"),end=new Date("2026-01-08");
    expect(scheduledComboState("SCHEDULED",start,end,true,new Date("2026-01-03"))).toBe("ACTIVE");
    expect(scheduledComboState("ACTIVE",start,end,true,new Date("2026-01-09"))).toBe("EXPIRED");
    expect(scheduledComboState("ACTIVE",start,end,false,new Date("2026-01-03"))).toBe("SOLD_OUT");
  });
  it("rejects invalid terminal transitions",()=>expect(()=>assertComboTransition("CANCELLED","ACTIVE")).toThrow());
});
