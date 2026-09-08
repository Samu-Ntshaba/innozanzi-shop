import type { Prisma } from "@/generated/prisma/client";
import Decimal from "decimal.js";
import { createHash } from "node:crypto";
import { resolveQuotationCart } from "@/domain/catalogue/product-source";
import type { getCurrentCart } from "@/domain/cart/service";
import { getCommerceSettings } from "./settings";
import { orderDiscount } from "./discounts";
export async function checkoutQuote(cart:NonNullable<Awaited<ReturnType<typeof getCurrentCart>>>,userId:string,code=""){
 const settings=await getCommerceSettings(),baseLines=await resolveQuotationCart(cart,new Decimal(0)),coupon=await orderDiscount(baseLines,userId,code);
 const headroom=baseLines.map(l=>Decimal.max(0,l.grossUnit.minus(String(l.sourceSnapshot.protectedFloor??l.grossUnit)).mul(l.quantity))),room=headroom.reduce((a,b)=>a.plus(b),new Decimal(0));
 let remainder=coupon?.discount??new Decimal(0);
 const lines=baseLines.map((l,i)=>{const discount=Decimal.min(headroom[i],i===baseLines.length-1?remainder:coupon&&room.gt(0)?coupon.discount.mul(headroom[i]).div(room).toDecimalPlaces(2,Decimal.ROUND_DOWN):0);remainder=remainder.minus(discount);const grossUnit=l.grossUnit.minus(discount.div(l.quantity)),netUnit=grossUnit.div(l.vatRate.plus(1));return {...l,grossUnit,netUnit,vatUnit:grossUnit.minus(netUnit),sourceSnapshot:{...l.sourceSnapshot,preDiscountUnit:l.grossUnit.toString(),couponCode:coupon?.code??null,lineDiscount:discount.toString()} as Prisma.InputJsonObject};});
 // Allocate any rounding remainder only into remaining safe contribution headroom.
 if(remainder.gt(0)){for(let i=0;i<lines.length&&remainder.gt(0);i++){const l=lines[i],available=Decimal.max(0,l.grossUnit.minus(String(baseLines[i].sourceSnapshot.protectedFloor??l.grossUnit)).mul(l.quantity));const extra=Decimal.min(remainder,available);l.grossUnit=l.grossUnit.minus(extra.div(l.quantity));l.netUnit=l.grossUnit.div(l.vatRate.plus(1));l.vatUnit=l.grossUnit.minus(l.netUnit);l.sourceSnapshot={...l.sourceSnapshot,lineDiscount:new Decimal(String(l.sourceSnapshot.lineDiscount)).plus(extra).toString()};remainder=remainder.minus(extra);}}
 if(remainder.gt(0))throw new Error("This discount needs a pricing review.");
 const subtotal=lines.reduce((s,l)=>s.plus(l.netUnit.mul(l.quantity)),new Decimal(0)).toDecimalPlaces(2),goodsVat=lines.reduce((s,l)=>s.plus(l.vatUnit.mul(l.quantity)),new Decimal(0)).toDecimalPlaces(2),productTotal=subtotal.plus(goodsVat),deliveryGross=productTotal.lt(settings.freeDeliveryThreshold)?new Decimal(settings.customerDelivery):new Decimal(0),delivery=settings.vatRegistered?deliveryGross.div(new Decimal(1).plus(settings.vatPercent/100)).toDecimalPlaces(2):deliveryGross,vat=goodsVat.plus(deliveryGross.minus(delivery)),total=productTotal.plus(deliveryGross);
 const fingerprint=createHash("sha256").update(JSON.stringify({lines:lines.map(l=>[l.sourceId,l.quantity,l.grossUnit.toString()]),total:total.toFixed(2),settings,coupon:coupon?.id})).digest("hex");
 return {baseLines,lines,coupon,subtotal,vat,productTotal,delivery,total,fingerprint};
}
