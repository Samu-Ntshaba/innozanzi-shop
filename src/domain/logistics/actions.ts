"use server";

import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { assertTransportTransition } from "@/domain/logistics/lifecycle";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getDocumentBranding } from "@/domain/documents/branding";

const optionalDate=z.preprocess(v=>v===""||v==null?undefined:v,z.coerce.date().optional());
const optionalUuid=z.preprocess(v=>v===""||v==null?undefined:v,z.string().uuid().optional());
const money=z.coerce.number().min(0).default(0);
const ref=()=>`TRN-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0,4).toUpperCase()}`;
const filesAllowed=new Set(["image/jpeg","image/png","image/webp","application/pdf"]);

async function upload(file:FormDataEntryValue|null,folder:string){
  if(!(file instanceof File)||!file.size)return undefined;
  if(file.size>20*1024*1024||!filesAllowed.has(file.type))throw new Error("Upload a JPG, PNG, WebP or PDF smaller than 20 MB.");
  const storage=createSupabaseAdmin(),bucket=process.env.SUPABASE_PRIVATE_BUCKET??"private-documents";
  if(!(await storage.storage.getBucket(bucket)).data){const made=await storage.storage.createBucket(bucket,{public:false,fileSizeLimit:20*1024*1024});if(made.error)throw made.error}
  const path=`transport/${folder}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-")}`;
  const result=await storage.storage.from(bucket).upload(path,file,{contentType:file.type});if(result.error)throw result.error;
  return{bucket,path,file};
}

export async function createTransport(formData:FormData){
  const ctx=await requirePermission("transport.create");
  const data=z.object({categoryId:z.string().uuid(),relatedRecord:z.string().trim().optional(),purpose:z.string().trim().max(3000).optional(),origin:z.string().trim().max(500).optional(),destination:z.string().trim().max(500).optional(),scheduledAt:optionalDate,providerId:optionalUuid,responsibleUserId:optionalUuid,technicianId:optionalUuid,specialInstructions:z.string().trim().max(3000).optional(),internalNote:z.string().trim().max(3000).optional()}).parse(Object.fromEntries(formData));
  const relation=data.relatedRecord?.match(/^(ORDER|DELIVERY_NOTE|RETURN_CASE|DISTRIBUTOR_CLAIM|SUPPLIER|PARTNERSHIP):([0-9a-f-]{36})$/i);
  if(data.relatedRecord&&!relation)throw new Error("The related logistics record is invalid.");
  const relatedType=relation?.[1].toUpperCase(),relatedId=relation?.[2];
  const [category,branding,order,deliveryNote,returnCase]=await Promise.all([
    prisma.transportCategory.findUniqueOrThrow({where:{id:data.categoryId}}),
    getDocumentBranding(),
    relatedType==="ORDER"?prisma.order.findUnique({where:{id:relatedId},include:{addresses:true}}):null,
    relatedType==="DELIVERY_NOTE"?prisma.deliveryNote.findUnique({where:{id:relatedId},include:{order:{include:{addresses:true}}}}):null,
    relatedType==="RETURN_CASE"?prisma.returnCase.findUnique({where:{id:relatedId},include:{order:{include:{addresses:true}}}}):null,
  ]);
  const linkedOrder=order??deliveryNote?.order??returnCase?.order;
  const deliveryAddress=linkedOrder?.addresses.find(address=>address.type==="DELIVERY"||address.type==="BOTH");
  const formattedAddress=deliveryAddress?[deliveryAddress.line1,deliveryAddress.line2,deliveryAddress.suburb,deliveryAddress.city,deliveryAddress.province,deliveryAddress.postalCode].filter(Boolean).join(", "):undefined;
  const relatedLabel=order?.orderNumber??deliveryNote?.deliveryNoteNumber??returnCase?.referenceNumber??relatedId;
  const inbound=relatedType==="RETURN_CASE";
  const origin=data.origin||(inbound?(formattedAddress??"Customer collection address to be confirmed"):branding.address);
  const destination=data.destination||(inbound?branding.address:(deliveryNote?.deliveryAddress??formattedAddress??"Delivery address to be confirmed"));
  const purpose=data.purpose||`${category.name}${relatedLabel?` for ${relatedLabel}`:""}`;
  const links={
    orderId:linkedOrder?.id,
    deliveryNoteId:relatedType==="DELIVERY_NOTE"?relatedId:undefined,
    returnCaseId:relatedType==="RETURN_CASE"?relatedId:undefined,
    distributorClaimId:relatedType==="DISTRIBUTOR_CLAIM"?relatedId:undefined,
    supplierId:relatedType==="SUPPLIER"?relatedId:undefined,
    partnershipId:relatedType==="PARTNERSHIP"?relatedId:undefined,
  };
  const number=ref();
  const row=await prisma.$transaction(async tx=>{
    const created=await tx.transportRecord.create({data:{referenceNumber:number,categoryId:data.categoryId,purpose,status:"REQUESTED",origin,destination,scheduledAt:data.scheduledAt,providerId:data.providerId,responsibleUserId:data.responsibleUserId,technicianId:data.technicianId,customerId:linkedOrder?.userId??returnCase?.customerId, ...links,purchaseOrderReference:linkedOrder?.purchaseOrderNumber??null,responsibility:category.defaultResponsibility,allocationMethod:linkedOrder?"FULL_ORDER":"NONE",estimatedAmount:new Decimal(0),approvedBudget:new Decimal(0),customerCharge:new Decimal(0),specialInstructions:data.specialInstructions||null,internalNote:data.internalNote||null,requestedById:ctx.user.id,isInternal:!data.providerId,isTestData:false}});
    await tx.transportEvent.create({data:{transportId:created.id,actorId:ctx.user.id,action:"CREATED",toStatus:"REQUESTED",internalNote:"Transport request created."}});
    await tx.auditLog.create({data:{actorId:ctx.user.id,action:"transport.create",entityType:"TransportRecord",entityId:created.id,after:{referenceNumber:number,categoryId:data.categoryId,relatedType,relatedId,automatedFields:["route","purpose","responsibility","allocation","financialDefaults"]}}});
    return created;
  });
  redirect(`/admin/logistics/${row.id}`);
}

export async function createTransportProvider(formData:FormData){
  const ctx=await requirePermission("transport.providers.manage");
  const data=z.object({name:z.string().trim().min(2).max(180),type:z.enum(["COURIER_COMPANY","LOGISTICS_COMPANY","SUPPLIER_DELIVERY","DISTRIBUTOR_DELIVERY","INTERNAL_DRIVER","INTERNAL_STAFF","TECHNICIAN","CUSTOMER_COLLECTION","INDEPENDENT_DRIVER","RIDE_HAILING","RENTAL_VEHICLE","OTHER"]),contactPerson:z.string().trim().max(160).optional(),phone:z.string().trim().max(80).optional(),email:z.string().email().optional().or(z.literal("")),serviceAreas:z.string().trim().max(1000).optional(),vehicleTypes:z.string().trim().max(1000).optional(),paymentTerms:z.string().trim().max(1000).optional()}).parse(Object.fromEntries(formData));
  const provider=await prisma.transportProvider.create({data:{...data,email:data.email||null,serviceAreas:data.serviceAreas?.split(",").map(x=>x.trim()).filter(Boolean)??[],vehicleTypes:data.vehicleTypes?.split(",").map(x=>x.trim()).filter(Boolean)??[]}});
  await prisma.auditLog.create({data:{actorId:ctx.user.id,action:"transport.provider.create",entityType:"TransportProvider",entityId:provider.id,after:{name:data.name,type:data.type}}});
  revalidatePath("/admin/logistics/providers");
}

export async function recordTransportQuote(formData:FormData){
  const ctx=await requirePermission("transport.quotation.record");
  const data=z.object({transportId:z.string().uuid(),providerId:optionalUuid,quoteNumber:z.string().trim().max(120).optional(),quotedAmount:z.coerce.number().positive(),vatAmount:money,additionalFees:money,expiresAt:optionalDate,notes:z.string().trim().max(2000).optional()}).parse(Object.fromEntries(formData));
  const saved=await upload(formData.get("document"),`${data.transportId}/quotes`);
  try{await prisma.$transaction(async tx=>{let documentId:string|undefined;if(saved){documentId=(await tx.uploadedDocument.create({data:{bucket:saved.bucket,path:saved.path,originalName:saved.file.name,mimeType:saved.file.type,size:saved.file.size,isPrivate:true}})).id}await tx.transportQuote.create({data:{transportId:data.transportId,providerId:data.providerId,quoteNumber:data.quoteNumber||null,quotedAmount:new Decimal(data.quotedAmount),vatAmount:new Decimal(data.vatAmount),additionalFees:new Decimal(data.additionalFees),expiresAt:data.expiresAt,notes:data.notes||null,documentId}});await tx.transportRecord.update({where:{id:data.transportId},data:{status:"QUOTATION_RECEIVED"}});await tx.transportEvent.create({data:{transportId:data.transportId,actorId:ctx.user.id,action:"QUOTATION_RECORDED",toStatus:"QUOTATION_RECEIVED",after:{amount:data.quotedAmount,providerId:data.providerId}}})})}catch(error){if(saved)await createSupabaseAdmin().storage.from(saved.bucket).remove([saved.path]);throw error}revalidatePath(`/admin/logistics/${data.transportId}`);
}

export async function selectTransportQuote(formData:FormData){
  const ctx=await requirePermission("transport.quotation.compare");const quoteId=z.string().uuid().parse(formData.get("quoteId"));
  const quote=await prisma.transportQuote.findUniqueOrThrow({where:{id:quoteId},include:{transport:true}});
  await prisma.$transaction([prisma.transportQuote.updateMany({where:{transportId:quote.transportId,status:"SELECTED"},data:{status:"DECLINED"}}),prisma.transportQuote.update({where:{id:quote.id},data:{status:"SELECTED",selectedAt:new Date()}}),prisma.transportRecord.update({where:{id:quote.transportId},data:{providerId:quote.providerId,quotedAmount:quote.quotedAmount,status:"AWAITING_APPROVAL"}}),prisma.transportEvent.create({data:{transportId:quote.transportId,actorId:ctx.user.id,action:"QUOTATION_SELECTED",fromStatus:quote.transport.status,toStatus:"AWAITING_APPROVAL",after:{quoteId:quote.id,amount:quote.quotedAmount.toString()}}})]);revalidatePath(`/admin/logistics/${quote.transportId}`);
}

export async function approveTransport(formData:FormData){
  const ctx=await requirePermission("transport.approve");const data=z.object({id:z.string().uuid(),approvedBudget:z.coerce.number().positive(),reason:z.string().trim().min(3).max(2000)}).parse(Object.fromEntries(formData));const row=await prisma.transportRecord.findUniqueOrThrow({where:{id:data.id}});if(row.requestedById===ctx.user.id&&!ctx.isSuperAdministrator)throw new Error("The transport requester cannot approve their own cost.");
  await prisma.$transaction([prisma.transportRecord.update({where:{id:row.id},data:{status:row.scheduledAt?"SCHEDULED":"APPROVED",approvedBudget:new Decimal(data.approvedBudget),approvedById:ctx.user.id,approvedAt:new Date()}}),prisma.transportEvent.create({data:{transportId:row.id,actorId:ctx.user.id,action:"APPROVED",fromStatus:row.status,toStatus:row.scheduledAt?"SCHEDULED":"APPROVED",internalNote:data.reason,after:{approvedBudget:data.approvedBudget}}}),prisma.auditLog.create({data:{actorId:ctx.user.id,action:"transport.approve",entityType:"TransportRecord",entityId:row.id,before:{status:row.status,approvedBudget:row.approvedBudget.toString()},after:{approvedBudget:data.approvedBudget,reason:data.reason}}})]);revalidatePath(`/admin/logistics/${row.id}`);
}

const nextStatuses=["SCHEDULED","DRIVER_ASSIGNED","COLLECTION_PENDING","COLLECTED","IN_TRANSIT","DELIVERY_ATTEMPTED","DELIVERED","FAILED_DELIVERY","RETURNED","CANCELLED","COMPLETED"] as const;
export async function updateTransportStatus(formData:FormData){
  const ctx=await requirePermission(formData.get("status")==="DELIVERED"?"transport.delivery.confirm":formData.get("status")==="COLLECTED"?"transport.collection.confirm":"transport.edit");
  const data=z.object({id:z.string().uuid(),status:z.enum(nextStatuses),publicNote:z.string().trim().max(2000).optional(),internalNote:z.string().trim().max(2000).optional(),recipientName:z.string().trim().max(160).optional(),failureReason:z.string().trim().max(2000).optional()}).parse(Object.fromEntries(formData));const row=await prisma.transportRecord.findUniqueOrThrow({where:{id:data.id}});
  if(data.status==="FAILED_DELIVERY"&&!data.failureReason)throw new Error("A failed-delivery reason is required.");
  assertTransportTransition(row.status,data.status);
  const proofFile=await upload(formData.get("proof"),`${row.referenceNumber}/proof`);
  try{await prisma.$transaction(async tx=>{const now=new Date();await tx.transportRecord.update({where:{id:row.id},data:{status:data.status,collectedAt:data.status==="COLLECTED"?now:undefined,deliveredAt:data.status==="DELIVERED"?now:undefined,completedAt:data.status==="COMPLETED"?now:undefined,failureReason:data.failureReason||undefined}});if(["COLLECTED","DELIVERED","FAILED_DELIVERY"].includes(data.status)){const proof=await tx.transportProof.create({data:{transportId:row.id,type:data.status==="COLLECTED"?"COLLECTION":data.status==="DELIVERED"?"DELIVERY":"FAILED_DELIVERY",recipientName:data.recipientName||null,occurredAt:now,quantityConfirmed:formData.get("quantityConfirmed")==="on",notes:data.publicNote||null}});if(proofFile){const doc=await tx.uploadedDocument.create({data:{bucket:proofFile.bucket,path:proofFile.path,originalName:proofFile.file.name,mimeType:proofFile.file.type,size:proofFile.file.size,isPrivate:true}});await tx.transportProofDocument.create({data:{proofId:proof.id,documentId:doc.id,type:"EVIDENCE"}})}}await tx.transportEvent.create({data:{transportId:row.id,actorId:ctx.user.id,action:`STATUS_${data.status}`,fromStatus:row.status,toStatus:data.status,publicNote:data.publicNote||null,internalNote:data.internalNote||null}})})}catch(error){if(proofFile)await createSupabaseAdmin().storage.from(proofFile.bucket).remove([proofFile.path]);throw error}revalidatePath(`/admin/logistics/${row.id}`);
}

export async function addTransportCost(formData:FormData){
  const ctx=await requirePermission("transport.expense.record");const data=z.object({transportId:z.string().uuid(),costTypeId:z.string().uuid(),description:z.string().trim().max(500).optional(),quantity:z.coerce.number().positive(),unitRate:money,vatAmount:money,isActual:z.string().optional()}).parse(Object.fromEntries(formData));const net=new Decimal(data.quantity).mul(data.unitRate),total=net.plus(data.vatAmount);
  await prisma.$transaction(async tx=>{await tx.transportCostComponent.create({data:{transportId:data.transportId,costTypeId:data.costTypeId,description:data.description||null,quantity:new Decimal(data.quantity),unitRate:new Decimal(data.unitRate),netAmount:net,vatAmount:new Decimal(data.vatAmount),totalAmount:total,isActual:data.isActual==="on"}});const sums=await tx.transportCostComponent.aggregate({where:{transportId:data.transportId,isActual:true},_sum:{totalAmount:true,vatAmount:true}});await tx.transportRecord.update({where:{id:data.transportId},data:{actualAmount:sums._sum.totalAmount??0,vatAmount:sums._sum.vatAmount??0}});await tx.transportEvent.create({data:{transportId:data.transportId,actorId:ctx.user.id,action:"COST_COMPONENT_ADDED",after:{amount:total.toString(),actual:data.isActual==="on"}}})});revalidatePath(`/admin/logistics/${data.transportId}`);
}

export async function recordTransportPayment(formData:FormData){
  const ctx=await requirePermission("transport.payment.confirm");const data=z.object({transportId:z.string().uuid(),amount:z.coerce.number().positive(),paymentDate:z.coerce.date(),method:z.string().trim().min(2).max(80),paymentReference:z.string().trim().min(3).max(160),notes:z.string().trim().max(2000).optional()}).parse(Object.fromEntries(formData));const row=await prisma.transportRecord.findUniqueOrThrow({where:{id:data.transportId}});if(!row.approvedById)throw new Error("Transport cost must be approved before payment.");if(row.approvedById===ctx.user.id)throw new Error("The cost approver cannot confirm its payment.");const outstanding=Math.max(0,Number(row.actualAmount||row.approvedBudget)-Number(row.amountPaid));if(data.amount>outstanding)throw new Error("Payment exceeds the outstanding transport amount.");const proof=await upload(formData.get("proof"),`${row.referenceNumber}/payment`);
  try{await prisma.$transaction(async tx=>{let proofDocumentId:string|undefined;if(proof)proofDocumentId=(await tx.uploadedDocument.create({data:{bucket:proof.bucket,path:proof.path,originalName:proof.file.name,mimeType:proof.file.type,size:proof.file.size,isPrivate:true}})).id;await tx.transportPayment.create({data:{transportId:row.id,processedById:ctx.user.id,amount:new Decimal(data.amount),paymentDate:data.paymentDate,method:data.method,paymentReference:data.paymentReference,proofDocumentId,notes:data.notes||null}});const amountPaid=new Decimal(row.amountPaid).plus(data.amount),target=Number(row.actualAmount)>0?row.actualAmount:row.approvedBudget,status=amountPaid.gte(target)?"PAID":"PARTIALLY_PAID";await tx.transportRecord.update({where:{id:row.id},data:{amountPaid,paymentStatus:status}});await tx.transportEvent.create({data:{transportId:row.id,actorId:ctx.user.id,action:"PAYMENT_RECORDED",after:{amount:data.amount,reference:data.paymentReference,status}}});await tx.auditLog.create({data:{actorId:ctx.user.id,action:"transport.payment.confirm",entityType:"TransportRecord",entityId:row.id,after:{amount:data.amount,paymentReference:data.paymentReference}}})})}catch(error){if(proof)await createSupabaseAdmin().storage.from(proof.bucket).remove([proof.path]);throw error}revalidatePath(`/admin/logistics/${row.id}`);revalidatePath("/admin/payments");
}

export async function saveTransportSetting(formData:FormData){
  await requirePermission("transport.settings.manage");const kind=z.enum(["category","cost"]).parse(formData.get("kind"));const data=z.object({code:z.string().trim().min(2).max(80).transform(x=>x.toUpperCase().replace(/[^A-Z0-9]+/g,"_")),name:z.string().trim().min(2).max(160)}).parse(Object.fromEntries(formData));
  if(kind==="category")await prisma.transportCategory.upsert({where:{code:data.code},update:{name:data.name,isActive:true},create:{...data}});else await prisma.transportCostType.upsert({where:{code:data.code},update:{name:data.name,isActive:true},create:{...data}});revalidatePath("/admin/logistics/settings");
}
