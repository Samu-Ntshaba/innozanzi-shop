"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";

const optional=(value:FormDataEntryValue|null)=>typeof value==="string"&&value.trim()?value.trim():undefined;

export async function saveOrderProcurement(formData:FormData){
  const context=await requirePermission("orders.update");
  const data=z.object({orderId:z.string().uuid(),supplierId:z.string().uuid(),status:z.enum(["DRAFT","SUBMITTED","CONFIRMED","RECEIVED","CANCELLED"]),supplierReference:z.string().max(160).optional(),supplierInvoiceNumber:z.string().max(160).optional(),supplierInvoiceTotal:z.coerce.number().nonnegative().optional(),expectedArrivalAt:z.coerce.date().optional(),internalNote:z.string().max(2000).optional()}).parse({orderId:formData.get("orderId"),supplierId:formData.get("supplierId"),status:formData.get("status"),supplierReference:optional(formData.get("supplierReference")),supplierInvoiceNumber:optional(formData.get("supplierInvoiceNumber")),supplierInvoiceTotal:optional(formData.get("supplierInvoiceTotal")),expectedArrivalAt:optional(formData.get("expectedArrivalAt")),internalNote:optional(formData.get("internalNote"))});
  const order=await prisma.order.findUniqueOrThrow({where:{id:data.orderId},include:{items:true}});
  if(!order.items.some(item=>item.supplierId===data.supplierId))throw new Error("This supplier is not attached to the order.");
  const requestNumber=`PROC-${order.orderNumber}-${data.supplierId.slice(0,6).toUpperCase()}`;
  const timestamps={orderedAt:data.status==="SUBMITTED"?new Date():undefined,confirmedAt:data.status==="CONFIRMED"?new Date():undefined,receivedAt:data.status==="RECEIVED"?new Date():undefined};
  const before=await prisma.orderProcurement.findUnique({where:{orderId_supplierId:{orderId:data.orderId,supplierId:data.supplierId}}});
  const procurement=await prisma.$transaction(async tx=>{const saved=await tx.orderProcurement.upsert({where:{orderId_supplierId:{orderId:data.orderId,supplierId:data.supplierId}},create:{...data,requestNumber,...timestamps},update:{status:data.status,supplierReference:data.supplierReference??null,supplierInvoiceNumber:data.supplierInvoiceNumber??null,supplierInvoiceTotal:data.supplierInvoiceTotal??null,expectedArrivalAt:data.expectedArrivalAt??null,internalNote:data.internalNote??null,...timestamps}});if(data.status==="SUBMITTED"&&order.status==="PROCESSING"){await tx.order.update({where:{id:order.id},data:{status:"SOURCING_ITEMS"}});await tx.orderStatusHistory.create({data:{orderId:order.id,fromStatus:"PROCESSING",toStatus:"SOURCING_ITEMS",actorId:context.user.id,note:"Supplier purchase order placed."}});await tx.deliveryTrackingEvent.create({data:{orderId:order.id,status:"SOURCING_ITEMS",actorId:context.user.id,publicNote:"The supplier order has been placed and your products are being prepared."}});}else if(data.status==="CONFIRMED"&&before?.status!=="CONFIRMED"){await tx.deliveryTrackingEvent.create({data:{orderId:order.id,status:order.status==="PROCESSING"?"SOURCING_ITEMS":order.status,actorId:context.user.id,publicNote:"The supplier has confirmed the product order. We will update you when the items are ready for delivery."}});}await tx.auditLog.create({data:{actorId:context.user.id,action:"order.procurement.update",entityType:"OrderProcurement",entityId:saved.id,before:before?{status:before.status,supplierReference:before.supplierReference}:undefined,after:{status:saved.status,supplierReference:saved.supplierReference,invoice:saved.supplierInvoiceNumber,expectedArrivalAt:saved.expectedArrivalAt}}});return saved;});
  if(before?.status!==procurement.status&&["SUBMITTED","CONFIRMED"].includes(procurement.status))await enqueueEmail(emailTemplates.supplierProgress(order.email,order.orderNumber,procurement.status),order.userId??undefined);
  revalidatePath(`/admin/orders/${data.orderId}`);
}
