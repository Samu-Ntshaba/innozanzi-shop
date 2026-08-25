"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentCart } from "@/domain/cart/service";
import { calculateCart, activeUnitPrice } from "@/domain/cart/calculations";
import { requireUser } from "@/domain/auth/session";
import { orderNumber } from "@/domain/quotations/lifecycle";
import { paymentAdapter } from "@/integrations/payments/adapters";

const checkoutSchema=z.object({recipient:z.string().trim().min(2).max(120),phone:z.string().trim().min(7).max(40),line1:z.string().trim().min(3).max(180),line2:z.string().trim().max(180).optional(),suburb:z.string().trim().max(120).optional(),city:z.string().trim().min(2).max(120),province:z.string().trim().min(2).max(120),postalCode:z.string().trim().min(3).max(12),notes:z.string().trim().max(1000).optional(),paymentMethod:z.enum(["EFT","PAYSTACK"])});

export async function placeRetailOrder(formData:FormData){
  const ctx=await requireUser();const data=checkoutSchema.parse(Object.fromEntries(formData));const cart=await getCurrentCart();
  if(!cart?.items.length)throw new Error("Your retail cart is empty.");
  const totals=calculateCart(cart.items);
  const paymentId=randomUUID();const idempotencyKey=`retail:${cart.id}:${randomUUID()}`;const order=await prisma.$transaction(async tx=>{
    for(const item of cart.items){const inventory=item.variant?.inventory??item.product.inventory[0];if(!inventory||inventory.onHand-inventory.reserved<item.quantity)throw new Error(`${item.product.name} is no longer available in that quantity.`)}
    const number=orderNumber();const created=await tx.order.create({data:{orderNumber:number,userId:ctx.user.id,email:ctx.user.email,phone:data.phone,subtotal:totals.net,vatTotal:totals.vat,grandTotal:totals.gross,status:"AWAITING_PAYMENT",paymentStatus:"PENDING",paymentMethod:data.paymentMethod,placedAt:new Date(),customerNotes:data.notes||null,items:{create:cart.items.map(item=>{const unit=activeUnitPrice(item.product,item.variant);const vat=unit.minus(unit.div(1.15));return{productId:item.productId,variantId:item.variantId,productName:item.product.name,sku:item.variant?.sku??item.product.sku,variantName:item.variant?.name,quantity:item.quantity,unitPrice:unit,costPrice:item.variant?.costPrice??item.product.costPrice,vatRate:0.15,vatTotal:vat.mul(item.quantity),lineTotal:unit.mul(item.quantity)}})},addresses:{create:{type:"DELIVERY",recipient:data.recipient,phone:data.phone,line1:data.line1,line2:data.line2||null,suburb:data.suburb||null,city:data.city,province:data.province,postalCode:data.postalCode}},payments:{create:{id:paymentId,provider:data.paymentMethod,status:"PENDING",amount:totals.gross,idempotencyKey}},statusHistory:{create:{toStatus:"AWAITING_PAYMENT",actorId:ctx.user.id,note:"Direct retail checkout"}}}});await tx.cart.update({where:{id:cart.id},data:{status:"CONVERTED"}});return created;
  },{isolationLevel:"Serializable"});
  if(data.paymentMethod==="EFT")redirect(`/checkout/complete/${order.id}`);const base=(process.env.NEXT_PUBLIC_SITE_URL??"https://shop.innozanzi.co.za").replace(/\/$/,"");const session=await paymentAdapter("PAYSTACK").initialize({paymentId,amount:totals.gross.toString(),currency:"ZAR",email:ctx.user.email,callbackUrl:`${base}/api/payments/paystack/callback`,idempotencyKey});await prisma.payment.update({where:{id:paymentId},data:{externalReference:session.externalReference,providerMetadata:{checkoutInitializedAt:new Date().toISOString(),retailOrderId:order.id}}});if(!session.redirectUrl)throw new Error("Paystack checkout is unavailable.");redirect(session.redirectUrl);
}
