import {describe,expect,it} from "vitest";
import {supplierRetailPrice} from "@/domain/catalogue/retail-pricing";

describe("supplierRetailPrice",()=>{
  it("turns an active supplier promotion into a customer sale while protecting five percent profit",()=>{
    const price=supplierRetailPrice({costPrice:375,recommendedRetail:509,promotionalPrice:199,promotionStartsAt:new Date("2026-01-01"),promotionEndsAt:new Date("2026-12-31"),now:new Date("2026-08-28")});
    expect(price.regularPrice.toNumber()).toBe(509);
    expect(price.salePrice?.toNumber()).toBe(208.95);
    expect(price.minimumPrice.toNumber()).toBe(208.95);
    expect(price.promotionActive).toBe(true);
  });

  it("does not apply an expired supplier promotion",()=>{
    const price=supplierRetailPrice({costPrice:375,recommendedRetail:509,promotionalPrice:199,promotionEndsAt:new Date("2026-08-01"),now:new Date("2026-08-28")});
    expect(price.salePrice).toBeNull();
    expect(price.minimumPrice.toNumber()).toBe(393.75);
    expect(price.promotionActive).toBe(false);
  });

  it("never presents a promotional price that is not below the normal supplier cost",()=>{
    const price=supplierRetailPrice({costPrice:100,recommendedRetail:150,promotionalPrice:110,now:new Date("2026-08-28")});
    expect(price.salePrice).toBeNull();
    expect(price.promotionActive).toBe(false);
  });

  it("keeps the displayed RRP authoritative instead of dropping to cost plus five percent at checkout",()=>{
    const price=supplierRetailPrice({costPrice:240,recommendedRetail:349,now:new Date("2026-08-29")});
    expect(price.regularPrice.toNumber()).toBe(349);
    expect(price.salePrice).toBeNull();
    expect((price.salePrice??price.regularPrice).toNumber()).toBe(349);
  });
});
