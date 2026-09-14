import { expect, it } from "vitest";
import { DEFAULT_COMMERCE } from "@/domain/commerce/config";
import { innozanziPrice } from "@/domain/commerce/engine";
import { reviewSnapshot } from "@/domain/commerce/order-review";
const item={productName:"Laptop",sourceType:"LOCAL",sourceId:null,productId:null,variantId:null,quantity:1,costPrice:"4000",unitPrice:innozanziPrice(4000,DEFAULT_COMMERCE).gross.toString(),sourceSnapshot:{pricingSettings:DEFAULT_COMMERCE}};
it("validates the saved commercial inputs without changing the customer price",()=>{
 expect(reviewSnapshot(item)).toBeNull();expect(reviewSnapshot(item,4000)).toBeNull();
 expect(reviewSnapshot(item,8000)).toMatch(/Current supplier cost/);
 expect(item.unitPrice).toBe(innozanziPrice(4000,DEFAULT_COMMERCE).gross.toString());
});
it("fails closed for missing snapshots and below-floor selling prices",()=>{
 expect(reviewSnapshot({...item,sourceSnapshot:{}})).toMatch(/snapshot/);
 expect(reviewSnapshot({...item,unitPrice:"1"})).toMatch(/Order-time price/);
});
