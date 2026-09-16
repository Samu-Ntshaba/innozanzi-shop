import Decimal from "decimal.js";
import type { CommerceSettings } from "@/domain/commerce/config";
import { getCommerceSettings } from "@/domain/commerce/settings";
import { innozanziPrice } from "@/domain/commerce/engine";
import { resolveEffectivePrice } from "@/domain/trading/effective-price";
export const MINIMUM_RETAIL_PROFIT_PERCENT = new Decimal(5); // Legacy exports; active pricing uses the versioned contribution policy.
export const DAILY_SPECIAL_DISCOUNT_PERCENT = new Decimal(5);
export async function minimumRetailPrice(cost:Decimal.Value,settings?:CommerceSettings){return innozanziPrice(cost,settings??await getCommerceSettings()).floor.gross;}
export async function supplierRetailPrice(input:{costPrice:Decimal.Value;recommendedRetail?:Decimal.Value|null;promotionalPrice?:Decimal.Value|null;promotionStartsAt?:Date|null;promotionEndsAt?:Date|null;special?:boolean;now?:Date;productKey?:string},policy?:CommerceSettings){
 const settings=policy??await getCommerceSettings(),now=input.now??new Date();
 const promotionActive=Boolean(input.promotionalPrice&&new Decimal(input.promotionalPrice).gt(0)&&new Decimal(input.promotionalPrice).lt(input.costPrice)&&(!input.promotionStartsAt||input.promotionStartsAt<=now)&&(!input.promotionEndsAt||input.promotionEndsAt>=now));
 const standard=innozanziPrice(input.costPrice,settings),current=promotionActive?innozanziPrice(input.promotionalPrice!,settings):standard,protectedResult=current.floor;
 // Supplier RRP is preserved on source records and snapshots only; it never sets the selling price.
 const override=input.productKey?await (await import("@/lib/prisma")).prisma.tradingPriceOverride.findUnique({where:{productKey:input.productKey},select:{price:true,expiresAt:true}}):null;
 const effective=resolveEffectivePrice({systemPrice:standard.gross,floor:standard.floor.gross,override,now}),regular=new Decimal(effective.price);
 const salePrice=promotionActive&&current.gross.lt(regular)?current.gross:null;
 return {regularPrice:regular,salePrice,minimumPrice:protectedResult.gross,promotionActive,protectedResult,priceSource:effective.source};
}
// Automatic daily discounts are replaced by deliberately configured promotions.
export function isDailySpecial(...args:unknown[]){void args;return false;}
