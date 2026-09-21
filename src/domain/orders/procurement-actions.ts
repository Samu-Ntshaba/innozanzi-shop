"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { reviewOrderEconomics } from "@/domain/commerce/order-review";
import { prisma } from "@/lib/prisma";
import { allowedSupplierProgressStatuses, deriveOrderStatusFromSupplierGroups, shouldEmailCustomerForOrderStatus } from "@/domain/orders/lifecycle";
import { enqueueEmail, stageEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";

const optional=(value:FormDataEntryValue|null)=>typeof value==="string"&&value.trim()?value.trim():undefined;

export async function assignOrderItemDistributor(formData:FormData){
  const context=await requirePermission("orders.update");
  const data=z.object({orderId:z.string().uuid(),itemId:z.string().uuid(),supplierId:z.string().uuid(),supplierSku:z.string().trim().min(1).max(160),costPrice:z.coerce.number().nonnegative().optional(),internalNote:z.string().trim().max(1000).optional()}).parse({orderId:formData.get("orderId"),itemId:formData.get("itemId"),supplierId:formData.get("supplierId"),supplierSku:formData.get("supplierSku"),costPrice:optional(formData.get("costPrice")),internalNote:optional(formData.get("internalNote"))});
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${data.orderId}::uuid FOR UPDATE`;
    const order=await tx.order.findUniqueOrThrow({where:{id:data.orderId},select:{paymentStatus:true,status:true}});
    if(order.paymentStatus!=="PAID"||["CANCELLED","REFUNDED","COMPLETED"].includes(order.status))throw new Error("A paid, active order is required before assigning a distributor.");
    const [item,supplier]=await Promise.all([tx.orderItem.findFirstOrThrow({where:{id:data.itemId,orderId:data.orderId}}),tx.supplier.findFirst({where:{id:data.supplierId,isActive:true,deletedAt:null,approvalStatus:"APPROVED",purchasingEnabled:true},select:{id:true,companyName:true}})]);
    if(!supplier)throw new Error("Select an approved distributor that is enabled for purchasing.");
    if(item.supplierId)throw new Error("This order item already has a distributor. Review the existing supplier order instead.");
    const saved=await tx.orderItem.update({where:{id:item.id},data:{supplierId:supplier.id,supplierSku:data.supplierSku,costPrice:data.costPrice,sourceType:"SUPPLIER"}});
    await tx.auditLog.create({data:{actorId:context.user.id,action:"order.item-distributor.assign",entityType:"OrderItem",entityId:item.id,before:{supplierId:item.supplierId,supplierSku:item.supplierSku,costPrice:item.costPrice?.toString()},after:{orderId:data.orderId,supplierId:supplier.id,supplier:supplier.companyName,supplierSku:saved.supplierSku,costPrice:saved.costPrice?.toString(),internalNote:data.internalNote}}});
  },{isolationLevel:"Serializable"});
  revalidatePath(`/admin/orders/${data.orderId}`);revalidatePath(`/mobile-admin/orders/${data.orderId}`);
}

export async function saveOrderProcurement(formData:FormData){
  const context=await requirePermission("orders.update");
  const data=z.object({orderId:z.string().uuid(),supplierId:z.string().uuid(),status:z.enum(["DRAFT","SUBMITTED","CONFIRMED","RECEIVED","CANCELLED"]),supplierReference:z.string().max(160).optional(),supplierInvoiceNumber:z.string().max(160).optional(),supplierInvoiceTotal:z.coerce.number().nonnegative().optional(),expectedDispatchAt:z.coerce.date().optional(),expectedDeliveryAt:z.coerce.date().optional(),deliveryWindow:z.string().max(120).optional(),internalNote:z.string().max(2000).optional()}).parse({orderId:formData.get("orderId"),supplierId:formData.get("supplierId"),status:formData.get("status"),supplierReference:optional(formData.get("supplierReference")),supplierInvoiceNumber:optional(formData.get("supplierInvoiceNumber")),supplierInvoiceTotal:optional(formData.get("supplierInvoiceTotal")),expectedDispatchAt:optional(formData.get("expectedDispatchAt")),expectedDeliveryAt:optional(formData.get("expectedDeliveryAt")),deliveryWindow:optional(formData.get("deliveryWindow")),internalNote:optional(formData.get("internalNote"))});
  const order=await prisma.order.findUniqueOrThrow({where:{id:data.orderId},include:{items:true}});
  if(!order.items.some(item=>item.supplierId===data.supplierId))throw new Error("This supplier is not attached to the order.");
  const requestNumber=`PROC-${order.orderNumber}-${data.supplierId.slice(0,6).toUpperCase()}`;
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${data.orderId}::uuid FOR UPDATE`;
    const current=await tx.order.findUniqueOrThrow({where:{id:data.orderId},include:{items:true}});
    const order=current;
    const before=await tx.orderProcurement.findUnique({where:{orderId_supplierId:{orderId:data.orderId,supplierId:data.supplierId}}});
    const previous=before?.status??"DRAFT";
    if(!allowedSupplierProgressStatuses(previous).includes(data.status))throw new Error("Supplier progress must follow placement, confirmation and receipt in order.");
    const changed=data.status!==previous;
    const timestamps={orderedAt:changed&&data.status==="SUBMITTED"?new Date():undefined,confirmedAt:changed&&data.status==="CONFIRMED"?new Date():undefined,receivedAt:changed&&data.status==="RECEIVED"?new Date():undefined};
    if(data.status!=="DRAFT"&&data.status!=="CANCELLED"){
      if(current.paymentStatus!=="PAID"||["CANCELLED","REFUNDED","COMPLETED"].includes(current.status))throw new Error("A verified paid, active order is required for supplier procurement.");
      const review=current.isTestData?[]:await reviewOrderEconomics(tx,current.items);
      if(review.length)throw new Error(`MARGIN REVIEW REQUIRED: ${review.join(" ")}`);
    }
    const saved=await tx.orderProcurement.upsert({where:{orderId_supplierId:{orderId:data.orderId,supplierId:data.supplierId}},create:{...data,requestNumber,...timestamps},update:{status:data.status,supplierReference:data.supplierReference??null,supplierInvoiceNumber:data.supplierInvoiceNumber??null,supplierInvoiceTotal:data.supplierInvoiceTotal??null,expectedDispatchAt:data.expectedDispatchAt??null,expectedDeliveryAt:data.expectedDeliveryAt??null,deliveryWindow:data.deliveryWindow??null,internalNote:data.internalNote??null,...timestamps}});if(data.status==="SUBMITTED"&&order.status==="PROCESSING"){await tx.order.update({where:{id:order.id},data:{status:"SOURCING_ITEMS"}});await tx.orderStatusHistory.create({data:{orderId:order.id,fromStatus:"PROCESSING",toStatus:"SOURCING_ITEMS",actorId:context.user.id,note:"Supplier purchase order placed."}});await tx.deliveryTrackingEvent.create({data:{orderId:order.id,status:"SOURCING_ITEMS",actorId:context.user.id,publicNote:"Your products are being prepared."}});}else if(data.status==="CONFIRMED"&&before?.status!=="CONFIRMED"){await tx.deliveryTrackingEvent.create({data:{orderId:order.id,status:order.status==="PROCESSING"?"SOURCING_ITEMS":order.status,actorId:context.user.id,publicNote:"Your products have been confirmed. We will update you when they are dispatched."}});}await tx.auditLog.create({data:{actorId:context.user.id,action:"order.procurement.update",entityType:"OrderProcurement",entityId:saved.id,before:before?{status:before.status,supplierReference:before.supplierReference}:undefined,after:{status:saved.status,supplierReference:saved.supplierReference,invoice:saved.supplierInvoiceNumber,expectedDispatchAt:saved.expectedDispatchAt,expectedDeliveryAt:saved.expectedDeliveryAt,deliveryWindow:saved.deliveryWindow}}});},{isolationLevel:"Serializable"});
  revalidatePath(`/admin/orders/${data.orderId}`);
  revalidatePath(`/mobile-admin/orders/${data.orderId}`);
}

export async function saveDistributorShipment(formData:FormData){
  const context=await requirePermission("orders.update");
  const data=z.object({orderId:z.string().uuid(),procurementId:z.string().uuid(),status:z.enum(["PENDING","SHIPPED","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED"]),deliveryCompany:z.string().trim().min(2).max(160).optional(),trackingNumber:z.string().trim().max(120).optional(),trackingUrl:z.string().url().optional(),estimatedDeliveryAt:z.coerce.date().optional(),deliveryWindow:z.string().max(120).optional(),deliveryInstructions:z.string().max(2000).optional()}).parse({orderId:formData.get("orderId"),procurementId:formData.get("procurementId"),status:formData.get("status"),deliveryCompany:optional(formData.get("deliveryCompany")),trackingNumber:optional(formData.get("trackingNumber")),trackingUrl:optional(formData.get("trackingUrl")),estimatedDeliveryAt:optional(formData.get("estimatedDeliveryAt")),deliveryWindow:optional(formData.get("deliveryWindow")),deliveryInstructions:optional(formData.get("deliveryInstructions"))});
  let message:ReturnType<typeof emailTemplates.orderStatus>|null=null;
  const result=await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${data.orderId}::uuid FOR UPDATE`;
    const order=await tx.order.findUniqueOrThrow({where:{id:data.orderId},include:{procurements:{include:{shipments:true,supplier:{select:{companyName:true}}}}}});
    const procurement=order.procurements.find(item=>item.id===data.procurementId);
    if(!procurement)throw new Error("This supplier fulfilment group does not belong to the order.");
    if(!["SUBMITTED","CONFIRMED","RECEIVED"].includes(procurement.status))throw new Error("Place the order with the distributor before recording delivery.");
    if(order.paymentStatus!=="PAID"||["CANCELLED","REFUNDED","COMPLETED"].includes(order.status))throw new Error("A verified paid, active order is required.");
    const existing=procurement.shipments[0];
    const deliveryCompany=data.deliveryCompany??existing?.deliveryCompany??procurement.supplier.companyName;
    const shipment=existing?await tx.shipment.update({where:{id:existing.id},data:{status:data.status,deliveryCompany:deliveryCompany,carrier:deliveryCompany,trackingNumber:data.trackingNumber??null,trackingUrl:data.trackingUrl??null,estimatedDeliveryAt:data.estimatedDeliveryAt??null,deliveryInstructions:data.deliveryInstructions??null,shippedAt:data.status==="SHIPPED"&& !existing.shippedAt?new Date():undefined,deliveredAt:data.status==="DELIVERED"?new Date():undefined}}):await tx.shipment.create({data:{orderId:order.id,procurementId:procurement.id,status:data.status,deliveryCompany:deliveryCompany,carrier:deliveryCompany,trackingNumber:data.trackingNumber??null,trackingUrl:data.trackingUrl??null,estimatedDeliveryAt:data.estimatedDeliveryAt??null,deliveryInstructions:data.deliveryInstructions??null,deliveryNoteNumber:`DN-${order.orderNumber}-${procurement.id.slice(0,6).toUpperCase()}`,shippedAt:data.status==="SHIPPED"?new Date():undefined,deliveredAt:data.status==="DELIVERED"?new Date():undefined}});
    await tx.orderProcurement.update({where:{id:procurement.id},data:{expectedDeliveryAt:data.estimatedDeliveryAt??undefined,deliveryWindow:data.deliveryWindow??undefined}});
    const groupStatuses=order.procurements.filter(item=>item.status!=="CANCELLED").map(item=>item.id===procurement.id?shipment.status:item.shipments[0]?.status??"PENDING");
    const target=deriveOrderStatusFromSupplierGroups(groupStatuses);
    const from=order.status;
    if(target!==from&&!["PAYMENT_VERIFIED","PROCESSING"].includes(target)){
      await tx.order.update({where:{id:order.id},data:{status:target,completedAt:undefined}});
      await tx.orderStatusHistory.create({data:{orderId:order.id,fromStatus:from,toStatus:target,actorId:context.user.id,note:`Distributor delivery update: ${target.replaceAll("_"," ").toLowerCase()}.`}});
    }
    const publicNote=data.status==="SHIPPED"?`Your order has shipped with ${deliveryCompany}.${data.trackingNumber?` Tracking: ${data.trackingNumber}.`:""}`:data.status==="OUT_FOR_DELIVERY"?"Your order is out for delivery.":data.status==="DELIVERED"?"Your order has been delivered.":data.estimatedDeliveryAt?`Expected delivery: ${data.estimatedDeliveryAt.toLocaleDateString("en-ZA")}${data.deliveryWindow?` · ${data.deliveryWindow}`:""}.`:"Delivery information was updated.";
    await tx.deliveryTrackingEvent.create({data:{orderId:order.id,status:target,actorId:context.user.id,publicNote,internalNote:data.deliveryInstructions??null}});
    await tx.auditLog.create({data:{actorId:context.user.id,action:"order.distributor-shipment.update",entityType:"Shipment",entityId:shipment.id,after:{supplierId:procurement.supplierId,status:data.status,courier:deliveryCompany,trackingNumber:data.trackingNumber,source:"DISTRIBUTOR"}}});
    if(target!==from&&shouldEmailCustomerForOrderStatus(target)){message=emailTemplates.orderStatus(order.email,order.orderNumber,target);await stageEmail(tx,message,order.userId??undefined,order.id)}
    return {orderNumber:order.orderNumber,userId:order.userId};
  },{isolationLevel:"Serializable"});
  if(message)await enqueueEmail(message,result.userId??undefined);
  revalidatePath(`/admin/orders/${data.orderId}`);revalidatePath(`/mobile-admin/orders/${data.orderId}`);revalidatePath(`/account/orders/${result.orderNumber}`);
}

export async function updateOrderDeliveryAddress(formData:FormData){
  const context=await requirePermission("orders.update");
  const data=z.object({orderId:z.string().uuid(),addressId:z.string().uuid(),recipient:z.string().trim().min(2).max(160),phone:z.string().trim().min(7).max(40),line1:z.string().trim().min(3).max(200),line2:z.string().trim().max(200).optional(),suburb:z.string().trim().max(120).optional(),city:z.string().trim().min(2).max(120),province:z.string().trim().min(2).max(120),postalCode:z.string().trim().min(3).max(20),reason:z.string().trim().min(5).max(500)}).parse({...Object.fromEntries(formData),line2:optional(formData.get("line2")),suburb:optional(formData.get("suburb"))});
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${data.orderId}::uuid FOR UPDATE`;
    const order=await tx.order.findUniqueOrThrow({where:{id:data.orderId},include:{procurements:true}}),before=await tx.orderAddress.findFirstOrThrow({where:{id:data.addressId,orderId:data.orderId,type:{in:["DELIVERY","BOTH"]}}});
    const supplierPlaced=order.procurements.some(item=>item.status!=="DRAFT"&&item.status!=="CANCELLED"),supplierNotified=formData.get("supplierNotified")==="on";
    if(supplierPlaced&&!supplierNotified)throw new Error("Confirm that every affected distributor was notified before changing a placed order address.");
    const after=await tx.orderAddress.update({where:{id:before.id},data:{recipient:data.recipient,phone:data.phone,line1:data.line1,line2:data.line2??null,suburb:data.suburb??null,city:data.city,province:data.province,postalCode:data.postalCode}});
    await tx.auditLog.create({data:{actorId:context.user.id,action:"order.delivery-address.change",entityType:"Order",entityId:order.id,before:{recipient:before.recipient,phone:before.phone,line1:before.line1,line2:before.line2,suburb:before.suburb,city:before.city,province:before.province,postalCode:before.postalCode},after:{recipient:after.recipient,phone:after.phone,line1:after.line1,line2:after.line2,suburb:after.suburb,city:after.city,province:after.province,postalCode:after.postalCode,reason:data.reason,supplierNotified}}});
    await tx.deliveryTrackingEvent.create({data:{orderId:order.id,status:order.status,actorId:context.user.id,internalNote:`Delivery address changed. ${data.reason}${supplierPlaced?" Affected distributor notification confirmed.":""}`}});
  },{isolationLevel:"Serializable"});
  revalidatePath(`/admin/orders/${data.orderId}`);revalidatePath(`/mobile-admin/orders/${data.orderId}`);
}
