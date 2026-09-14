import Decimal from "decimal.js";
import { getCommerceSettings } from "@/domain/commerce/settings";
import { innozanziPrice } from "@/domain/commerce/engine";
export const MINIMUM_RETAIL_PROFIT_PERCENT = new Decimal(5); // Legacy exports; active pricing uses the versioned contribution policy.
export const DAILY_SPECIAL_DISCOUNT_PERCENT = new Decimal(5);
export async function minimumRetailPrice(cost:Decimal.Value){return innozanziPrice(cost,await getCommerceSettings()).floor.gross;}
export async function supplierRetailPrice(input:{costPrice:Decimal.Value;recommendedRetail?:Decimal.Value|null;promotionalPrice?:Decimal.Value|null;promotionStartsAt?:Date|null;promotionEndsAt?:Date|null;special?:boolean;now?:Date}){
 const settings=await getCommerceSettings(),now=input.now??new Date();
 const promotionActive=Boolean(input.promotionalPrice&&new Decimal(input.promotionalPrice).gt(0)&&new Decimal(input.promotionalPrice).lt(input.costPrice)&&(!input.promotionStartsAt||input.promotionStartsAt<=now)&&(!input.promotionEndsAt||input.promotionEndsAt>=now));
 const standard=innozanziPrice(input.costPrice,settings),current=promotionActive?innozanziPrice(input.promotionalPrice!,settings):standard,protectedResult=current.floor;
 // Supplier RRP is preserved on source records and snapshots only; it never sets the selling price.
 const regular=standard.gross;
 const salePrice=promotionActive&&current.gross.lt(regular)?current.gross:null;
 return {regularPrice:regular,salePrice,minimumPrice:protectedResult.gross,promotionActive,protectedResult};
}
// Automatic daily discounts are replaced by deliberately configured promotions.
export function isDailySpecial(...args:unknown[]){void args;return false;}
