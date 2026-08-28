"use server";

import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/domain/auth/session";
import { getCurrentCart } from "@/domain/cart/service";
import { resolveQuotationCart } from "@/domain/catalogue/product-source";
import { orderNumber } from "@/domain/quotations/lifecycle";
import { beginHostedOrderPayment } from "@/domain/payments/orchestration";
import { prisma } from "@/lib/prisma";

const schema=z.object({recipient:z.string().trim().min(2).max(120),phone:z.string().trim().min(7).max(40),line1:z.string().trim().min(3).max(180),line2:z.string().trim().max(180).optional(),suburb:z.string().trim().max(120).optional(),city:z.string().trim().min(2).max(120),province:z.string().trim().min(2).max(120),postalCode:z.string().trim().min(3).max(12),notes:z.string().trim().max(1000).optional(),paymentMethod:z.enum(["EFT","PAYSTACK"])});

export async function placeRetailOrder(formData:FormData){
  const ctx=await requireUser(),data=schema.parse(Object.fromEntries(formData)),cart=await getCurrentCart();
  if(!cart||(!cart.items.length&&!cart.supplierItems.length))throw new Error("Your cart is empty.");
  const markup=new Decimal(5),lines=await resolveQuotationCart(cart,markup),subtotal=lines.reduce((sum,line)=>sum.plus(line.netUnit.mul(line.quantity)),new Decimal(0)),vatTotal=lines.reduce((sum,line)=>sum.plus(line.vatUnit.mul(line.quantity)),new Decimal(0)),grandTotal=subtotal.plus(vatTotal),paymentId=randomUUID(),idempotencyKey=`retail:${cart.id}:${randomUUID()}`;
  const order=await prisma.$transaction(async tx=>{
    await tx.user.update({where:{id:ctx.user.id},data:{phone:data.phone}});
    const created=await tx.order.create({data:{orderNumber:orderNumber(),userId:ctx.user.id,pcProjectId:cart.pcProjectId,email:ctx.user.email,phone:data.phone,subtotal,vatTotal,grandTotal,status:"AWAITING_PAYMENT",paymentStatus:"PENDING",paymentMethod:data.paymentMethod,placedAt:new Date(),customerNotes:data.notes||null,items:{create:lines.map(line=>({productId:line.productId,variantId:line.variantId,productName:line.productName,sku:line.sku??line.supplierSku??"ITEM",quantity:line.quantity,unitPrice:line.grossUnit,costPrice:line.costPrice,vatRate:line.vatRate,vatTotal:line.vatUnit.mul(line.quantity),lineTotal:line.grossUnit.mul(line.quantity),sourceType:line.sourceType,sourceId:line.sourceId,supplierId:line.supplierId,supplierSku:line.supplierSku,sourceSnapshot:line.sourceSnapshot,pricingRule:"RETAIL_MINIMUM_5_PERCENT_PROFIT",markupPercent:markup,stockSnapshot:line.available}))},addresses:{create:{type:"DELIVERY",recipient:data.recipient,phone:data.phone,line1:data.line1,line2:data.line2||null,suburb:data.suburb||null,city:data.city,province:data.province,postalCode:data.postalCode}},payments:{create:{id:paymentId,provider:data.paymentMethod,status:"PENDING",amount:grandTotal,idempotencyKey}},statusHistory:{create:{toStatus:"AWAITING_PAYMENT",actorId:ctx.user.id,note:cart.pcProjectId?"PC project component purchase":"Direct retail checkout"}}}});
    await tx.cart.update({where:{id:cart.id},data:{status:"CONVERTED"}});return created;
  },{isolationLevel:"Serializable"});
  if(data.paymentMethod==="EFT")redirect(`/checkout/complete/${order.id}`);
  const base=(process.env.NEXT_PUBLIC_SITE_URL??"https://shop.innozanzi.co.za").replace(/\/$/,"");
  const session=await beginHostedOrderPayment({paymentId,callbackUrl:`${base}/api/payments/paystack/callback`});
  if(!session.redirectUrl)throw new Error("Paystack checkout is unavailable.");redirect(session.redirectUrl);
}
