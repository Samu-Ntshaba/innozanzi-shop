"use server";
import { gatewayConfigured } from "@/integrations/payments/approved-gateways";

import { contributionAtPrice } from "@/domain/commerce/engine";
import { getCommerceSettings } from "@/domain/commerce/settings";
import { checkoutQuote } from "@/domain/commerce/checkout";
import { orderDiscount } from "@/domain/commerce/discounts";
import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/domain/auth/session";
import { getCurrentCart } from "@/domain/cart/service";
import { orderNumber } from "@/domain/quotations/lifecycle";
import { beginHostedOrderPayment } from "@/domain/payments/orchestration";
import { deliveryFromForm } from "@/domain/addresses/service";
import { prisma } from "@/lib/prisma";

const schema = z.object({ notes: z.string().trim().max(1000).optional(), paymentMethod: z.enum(["OZOW", "PAYFAST"]) });

export async function placeRetailOrder(_state: { error: string }, formData: FormData) {
  const ctx = await requireUser();
  let data;
  try { data = { ...schema.parse(Object.fromEntries(formData)), ...await deliveryFromForm(ctx.user.id, formData) }; }
  catch (error) { return { error: error instanceof Error && /^(Complete|Please select|Please enter|Choose one|Please add|We currently deliver)/.test(error.message) ? error.message : "Please check your delivery and payment details." }; }
  if(!gatewayConfigured(data.paymentMethod))return {error:"This payment method is not available yet. Please contact support."};
  const cart = await getCurrentCart();
  if(!cart||(!cart.items.length&&!cart.supplierItems.length))throw new Error("Your cart is empty.");
  const code=String(formData.get("couponCode")??"").trim().slice(0,40);
  let quote;try{quote=await checkoutQuote(cart,ctx.user.id,code);}catch(error){return {error:error instanceof Error?error.message:"Please review your basket."};}
  if(formData.get("priceFingerprint")!==quote.fingerprint)return {error:"Prices, stock or an offer changed. Reload checkout to review the updated total before paying."};
  const pricingSettings=await getCommerceSettings();
  const {lines,subtotal,vat:vatTotal,delivery:deliveryTotal,total:grandTotal}=quote,markup=new Decimal(0),paymentId=randomUUID(),idempotencyKey=`retail:${cart.id}:${randomUUID()}`;
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${cart.id}::uuid FOR UPDATE`;
    const lockedCart=await tx.cart.findUniqueOrThrow({where:{id:cart.id}});if(lockedCart.status!=="ACTIVE")throw new Error("This cart has already been checked out.");
    if(quote.coupon){
      await tx.$queryRaw`SELECT id FROM "Coupon" WHERE id = ${quote.coupon.id}::uuid FOR UPDATE`;
      const current=await orderDiscount(quote.baseLines,ctx.user.id,code,tx);
      if(!current||current.id!==quote.coupon.id||!current.discount.equals(quote.coupon.discount))throw new Error("The offer changed. Please reload checkout.");
    }
    await tx.user.update({where:{id:ctx.user.id},data:{phone:data.phone}});
    if (formData.get("saveAddress") === "on" && !formData.get("addressId")) {
      const count = await tx.address.count({ where: { userId: ctx.user.id, deletedAt: null } });
      if (count < 20) await tx.address.create({ data: { userId: ctx.user.id, type: "DELIVERY", isDefault: count === 0, recipient: data.recipient, phone: data.phone, line1: data.line1, line2: data.line2, suburb: data.suburb, city: data.city, province: data.province, postalCode: data.postalCode, googlePlaceId: data.googlePlaceId } });
    }
    const created=await tx.order.create({data:{orderNumber:orderNumber(),userId:ctx.user.id,pcProjectId:cart.pcProjectId,origin:cart.origin,aiRecommendationId:cart.aiRecommendationId,email:ctx.user.email,phone:data.phone,subtotal,vatTotal,deliveryTotal,grandTotal,status:"AWAITING_PAYMENT",paymentStatus:"PENDING",paymentMethod:data.paymentMethod,placedAt:new Date(),customerNotes:data.notes||null,items:{create:lines.map(line=>({productId:line.productId,variantId:line.variantId,productName:line.productName,sku:line.sku??line.supplierSku??"ITEM",quantity:line.quantity,unitPrice:line.grossUnit,costPrice:line.costPrice,vatRate:line.vatRate,vatTotal:line.vatUnit.mul(line.quantity),lineTotal:line.grossUnit.mul(line.quantity),sourceType:line.sourceType,sourceId:line.sourceId,supplierId:line.supplierId,supplierSku:line.supplierSku,sourceSnapshot:{...line.sourceSnapshot,expectedUnitEconomics:contributionAtPrice(line.costPrice,line.grossUnit,pricingSettings,data.paymentMethod)},pricingRule:line.pricingRule,markupPercent:markup,stockSnapshot:line.available}))},addresses:{create:{type:"DELIVERY",recipient:data.recipient,phone:data.phone,line1:data.line1,line2:data.line2||null,suburb:data.suburb||null,city:data.city,province:data.province,postalCode:data.postalCode}},payments:{create:{id:paymentId,provider:data.paymentMethod,status:"PENDING",amount:grandTotal,idempotencyKey}},statusHistory:{create:{toStatus:"AWAITING_PAYMENT",actorId:ctx.user.id,note:cart.pcProjectId?"PC project component purchase":"Direct retail checkout"}}}});
    if(quote.coupon)await tx.couponRedemption.create({data:{couponId:quote.coupon.id,userId:ctx.user.id,orderId:created.id,discountAmount:quote.coupon.discount}});
    if(cart.aiRecommendationId){await tx.aIUsage.updateMany({where:{recommendationId:cart.aiRecommendationId},data:{orderId:created.id}});await tx.recommendationEvent.create({data:{userId:ctx.user.id,sessionId:`user:${ctx.user.id}`,eventType:"AI_CHECKOUT_STARTED",entityType:"ORDER",entityId:created.id,recommendationId:cart.aiRecommendationId,context:"checkout"}})}
    await tx.cart.update({where:{id:cart.id},data:{status:"CONVERTED"}});return created;
  },{isolationLevel:"Serializable"});

  const base=(process.env.NEXT_PUBLIC_SITE_URL??"https://shop.innozanzi.co.za").replace(/\/$/,"");
  const session=await beginHostedOrderPayment({paymentId,callbackUrl:`${base}/api/payments/return/${paymentId}`});
  if(!session.redirectUrl)throw new Error("Secure checkout is unavailable.");redirect(session.redirectUrl);
}
