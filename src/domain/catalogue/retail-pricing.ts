import Decimal from "decimal.js";
import { getCommerceSettings } from "@/domain/commerce/settings";
import { protectedPrice } from "@/domain/commerce/engine";
export const MINIMUM_RETAIL_PROFIT_PERCENT = new Decimal(5); // Legacy exports; active pricing uses the versioned contribution policy.
export const DAILY_SPECIAL_DISCOUNT_PERCENT = new Decimal(5);
function floor(cost:Decimal.Value,settings:Awaited<ReturnType<typeof getCommerceSettings>>){const a=protectedPrice(cost,settings,"PAYFAST"),b=protectedPrice(cost,settings,"OZOW");return a.gross.gte(b.gross)?a:b;}
export async function minimumRetailPrice(cost:Decimal.Value){return floor(cost,await getCommerceSettings()).gross;}
export async function supplierRetailPrice(input:{costPrice:Decimal.Value;recommendedRetail?:Decimal.Value|null;promotionalPrice?:Decimal.Value|null;promotionStartsAt?:Date|null;promotionEndsAt?:Date|null;special?:boolean;now?:Date}){
 const settings=await getCommerceSettings(),now=input.now??new Date();
 const promotionActive=Boolean(input.promotionalPrice&&new Decimal(input.promotionalPrice).gt(0)&&new Decimal(input.promotionalPrice).lt(input.costPrice)&&(!input.promotionStartsAt||input.promotionStartsAt<=now)&&(!input.promotionEndsAt||input.promotionEndsAt>=now));
 const standard=floor(input.costPrice,settings),protectedResult=promotionActive?floor(input.promotionalPrice!,settings):standard;
 const regular=Decimal.max(standard.gross,input.recommendedRetail??standard.gross).toDecimalPlaces(2,Decimal.ROUND_CEIL);
 const salePrice=promotionActive&&protectedResult.gross.lt(regular)?protectedResult.gross:null;
 return {regularPrice:regular,salePrice,minimumPrice:protectedResult.gross,promotionActive,protectedResult};
}
// Automatic daily discounts are replaced by deliberately configured promotions.
export function isDailySpecial(...args:unknown[]){void args;return false;}
