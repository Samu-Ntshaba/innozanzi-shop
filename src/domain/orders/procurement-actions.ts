"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { reviewOrderEconomics } from "@/domain/commerce/order-review";
import { prisma } from "@/lib/prisma";

const optional=(value:FormDataEntryValue|null)=>typeof value==="string"&&value.trim()?value.trim():undefined;

export async function saveOrderProcurement(formData:FormData){
  const context=await requirePermission("orders.update");
  const data=z.object({orderId:z.string().uuid(),supplierId:z.string().uuid(),status:z.enum(["DRAFT","SUBMITTED","CONFIRMED","RECEIVED","CANCELLED"]),supplierReference:z.string().max(160).optional(),supplierInvoiceNumber:z.string().max(160).optional(),supplierInvoiceTotal:z.coerce.number().nonnegative().optional(),expectedArrivalAt:z.coerce.date().optional(),internalNote:z.string().max(2000).optional()}).parse({orderId:formData.get("orderId"),supplierId:formData.get("supplierId"),status:formData.get("status"),supplierReference:optional(formData.get("supplierReference")),supplierInvoiceNumber:optional(formData.get("supplierInvoiceNumber")),supplierInvoiceTotal:optional(formData.get("supplierInvoiceTotal")),expectedArrivalAt:optional(formData.get("expectedArrivalAt")),internalNote:optional(formData.get("internalNote"))});
  const order=await prisma.order.findUniqueOrThrow({where:{id:data.orderId},include:{items:true}});
  if(!order.items.some(item=>item.supplierId===data.supplierId))throw new Error("This supplier is not attached to the order.");
  const requestNumber=`PROC-${order.orderNumber}-${data.supplierId.slice(0,6).toUpperCase()}`;
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${data.orderId}::uuid FOR UPDATE`;
    const current=await tx.order.findUniqueOrThrow({where:{id:data.orderId},include:{items:true}});
    const order=current;
    const before=await tx.orderProcurement.findUnique({where:{orderId_supplierId:{orderId:data.orderId,supplierId:data.supplierId}}});
    const allowed:Record<string,string[]>={DRAFT:["SUBMITTED","CANCELLED"],SUBMITTED:["CONFIRMED","CANCELLED"],CONFIRMED:["RECEIVED","CANCELLED"],RECEIVED:[],CANCELLED:[]};
    const previous=before?.status??"DRAFT";
    if(data.status!==previous&&!allowed[previous].includes(data.status))throw new Error("Supplier progress must follow placement, confirmation and receipt in order.");
    const changed=data.status!==previous;
    const timestamps={orderedAt:changed&&data.status==="SUBMITTED"?new Date():undefined,confirmedAt:changed&&data.status==="CONFIRMED"?new Date():undefined,receivedAt:changed&&data.status==="RECEIVED"?new Date():undefined};
    if(data.status!=="DRAFT"&&data.status!=="CANCELLED"){
      if(current.paymentStatus!=="PAID"||["CANCELLED","REFUNDED","COMPLETED"].includes(current.status))throw new Error("A verified paid, active order is required for supplier procurement.");
      const review=await reviewOrderEconomics(tx,current.items);
      if(review.length)throw new Error(`MARGIN REVIEW REQUIRED: ${review.join(" ")}`);
      if(!data.supplierReference)throw new Error("Record the supplier reference before confirming placement.");
    }
    const saved=await tx.orderProcurement.upsert({where:{orderId_supplierId:{orderId:data.orderId,supplierId:data.supplierId}},create:{...data,requestNumber,...timestamps},update:{status:data.status,supplierReference:data.supplierReference??null,supplierInvoiceNumber:data.supplierInvoiceNumber??null,supplierInvoiceTotal:data.supplierInvoiceTotal??null,expectedArrivalAt:data.expectedArrivalAt??null,internalNote:data.internalNote??null,...timestamps}});if(data.status==="SUBMITTED"&&order.status==="PROCESSING"){await tx.order.update({where:{id:order.id},data:{status:"SOURCING_ITEMS"}});await tx.orderStatusHistory.create({data:{orderId:order.id,fromStatus:"PROCESSING",toStatus:"SOURCING_ITEMS",actorId:context.user.id,note:"Supplier purchase order placed."}});await tx.deliveryTrackingEvent.create({data:{orderId:order.id,status:"SOURCING_ITEMS",actorId:context.user.id,publicNote:"Your products are being prepared."}});}else if(data.status==="CONFIRMED"&&before?.status!=="CONFIRMED"){await tx.deliveryTrackingEvent.create({data:{orderId:order.id,status:order.status==="PROCESSING"?"SOURCING_ITEMS":order.status,actorId:context.user.id,publicNote:"Your products have been confirmed. We will update you when they are ready for delivery."}});}await tx.auditLog.create({data:{actorId:context.user.id,action:"order.procurement.update",entityType:"OrderProcurement",entityId:saved.id,before:before?{status:before.status,supplierReference:before.supplierReference}:undefined,after:{status:saved.status,supplierReference:saved.supplierReference,invoice:saved.supplierInvoiceNumber,expectedArrivalAt:saved.expectedArrivalAt}}});},{isolationLevel:"Serializable"});
  revalidatePath(`/admin/orders/${data.orderId}`);
}
