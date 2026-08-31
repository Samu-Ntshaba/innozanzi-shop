"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

const optional=(value:FormDataEntryValue|null)=>typeof value==="string"&&value.trim()?value.trim():undefined;

export async function saveOrderProcurement(formData:FormData){
  const context=await requirePermission("orders.update");
  const data=z.object({orderId:z.string().uuid(),supplierId:z.string().uuid(),status:z.enum(["DRAFT","SUBMITTED","CONFIRMED","RECEIVED","CANCELLED"]),supplierReference:z.string().max(160).optional(),supplierInvoiceNumber:z.string().max(160).optional(),supplierInvoiceTotal:z.coerce.number().nonnegative().optional(),expectedArrivalAt:z.coerce.date().optional(),internalNote:z.string().max(2000).optional()}).parse({orderId:formData.get("orderId"),supplierId:formData.get("supplierId"),status:formData.get("status"),supplierReference:optional(formData.get("supplierReference")),supplierInvoiceNumber:optional(formData.get("supplierInvoiceNumber")),supplierInvoiceTotal:optional(formData.get("supplierInvoiceTotal")),expectedArrivalAt:optional(formData.get("expectedArrivalAt")),internalNote:optional(formData.get("internalNote"))});
  const order=await prisma.order.findUniqueOrThrow({where:{id:data.orderId},include:{items:true}});
  if(!order.items.some(item=>item.supplierId===data.supplierId))throw new Error("This supplier is not attached to the order.");
  const requestNumber=`PROC-${order.orderNumber}-${data.supplierId.slice(0,6).toUpperCase()}`;
  const timestamps={orderedAt:data.status==="SUBMITTED"?new Date():undefined,confirmedAt:data.status==="CONFIRMED"?new Date():undefined,receivedAt:data.status==="RECEIVED"?new Date():undefined};
  const before=await prisma.orderProcurement.findUnique({where:{orderId_supplierId:{orderId:data.orderId,supplierId:data.supplierId}}});
  const procurement=await prisma.orderProcurement.upsert({where:{orderId_supplierId:{orderId:data.orderId,supplierId:data.supplierId}},create:{...data,requestNumber,...timestamps},update:{status:data.status,supplierReference:data.supplierReference??null,supplierInvoiceNumber:data.supplierInvoiceNumber??null,supplierInvoiceTotal:data.supplierInvoiceTotal??null,expectedArrivalAt:data.expectedArrivalAt??null,internalNote:data.internalNote??null,...timestamps}});
  await prisma.auditLog.create({data:{actorId:context.user.id,action:"order.procurement.update",entityType:"OrderProcurement",entityId:procurement.id,before:before?{status:before.status,supplierReference:before.supplierReference}:undefined,after:{status:procurement.status,supplierReference:procurement.supplierReference,invoice:procurement.supplierInvoiceNumber,expectedArrivalAt:procurement.expectedArrivalAt}}});
  revalidatePath(`/admin/orders/${data.orderId}`);
}
