"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { generateTemporaryPassword, invitationExpiry } from "@/domain/auth/invitation-utils";
import { hashPassword } from "@/domain/auth/password";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";
import { prisma } from "@/lib/prisma";
import { requireClientPortal } from "./session";

const allowedModules=["PRODUCTS","QUOTATIONS","ORDERS","PAYMENTS","DELIVERIES","RETURNS","SUPPORT","TECHNICIANS","TRAINING","DOCUMENTS","REPORTS","USER_MANAGEMENT"] as const;

export async function assignClientPortal(formData:FormData){
  const actor=await requirePermission("customers.manage");
  const userId=z.string().uuid().parse(formData.get("userId"));
  const tier=z.enum(["STANDARD","PRIORITY","MANAGED","ENTERPRISE"]).parse(formData.get("tier"));
  const modules=allowedModules.filter(module=>formData.get(`module:${module}`)==="on");
  const internalNotes=z.string().trim().max(5000).optional().parse(String(formData.get("internalNotes")||""));
  if(!modules.length)throw new Error("Enable at least one portal module.");
  const customer=await prisma.user.findUniqueOrThrow({where:{id:userId},include:{customerProfile:{include:{company:true,clientPortal:true}}}});
  if(!customer.customerProfile)throw new Error("Client profile not found.");
  if(customer.email.endsWith("@internal.invalid"))throw new Error("Add a valid client email before assigning portal access.");
  const company=customer.customerProfile.company?.companyName??customer.name??"your organisation";
  const needsActivation=!customer.passwordHash||customer.status!=="ACTIVE";
  const customerRole=needsActivation?await prisma.role.findUniqueOrThrow({where:{slug:"customer"}}):null;
  const temporaryPassword=needsActivation?generateTemporaryPassword():null;
  const rawToken=needsActivation?randomBytes(32).toString("base64url"):null;
  const expiresAt=needsActivation?invitationExpiry():null;
  await prisma.$transaction(async tx=>{
    if(needsActivation){
      await tx.user.update({where:{id:userId},data:{passwordHash:await hashPassword(temporaryPassword!),status:"INVITED",mustChangePassword:true,temporaryPasswordExpiresAt:expiresAt}});
      await tx.userRole.upsert({where:{userId_roleId:{userId,roleId:customerRole!.id}},update:{},create:{userId,roleId:customerRole!.id,assignedBy:actor.user.id}});
      await tx.userInvitation.deleteMany({where:{userId,acceptedAt:null}});
      await tx.userInvitation.create({data:{userId,invitedById:actor.user.id,roleId:customerRole!.id,accountType:"CUSTOMER",activationTokenHash:createHash("sha256").update(rawToken!).digest("hex"),expiresAt:expiresAt!}});
    }
    await tx.clientPortal.upsert({where:{customerProfileId:customer.customerProfile!.id},update:{primaryUserId:userId,assignedById:actor.user.id,status:"ACTIVE",tier,modules,internalNotes:internalNotes||null,invitationStatus:needsActivation?"SENT":"ACCEPTED",invitedAt:new Date(),activatedAt:needsActivation?null:new Date()},create:{customerProfileId:customer.customerProfile!.id,primaryUserId:userId,assignedById:actor.user.id,status:"ACTIVE",tier,modules,internalNotes:internalNotes||null,invitationStatus:needsActivation?"SENT":"ACCEPTED",invitedAt:new Date(),activatedAt:needsActivation?null:new Date()}});
    await tx.auditLog.create({data:{actorId:actor.user.id,action:"client-portal.assign",entityType:"ClientPortal",entityId:customer.customerProfile!.id,after:{userId,tier,modules,needsActivation}}});
  });
  await enqueueEmail(emailTemplates.clientPortalAccess(customer.email,customer.name??"Client",company,needsActivation?{temporaryPassword:temporaryPassword!,token:rawToken!,expiresAt:expiresAt!}:undefined),customer.id);
  revalidatePath(`/admin/customers/${userId}`);redirect(`/admin/customers/${userId}?portal=assigned`);
}

export async function setClientPortalStatus(formData:FormData){
  const actor=await requirePermission("customers.manage");
  const userId=z.string().uuid().parse(formData.get("userId"));
  const status=z.enum(["ACTIVE","SUSPENDED"]).parse(formData.get("status"));
  const portal=await prisma.clientPortal.update({where:{primaryUserId:userId},data:{status}});
  await prisma.auditLog.create({data:{actorId:actor.user.id,action:`client-portal.${status.toLowerCase()}`,entityType:"ClientPortal",entityId:portal.id,after:{status}}});
  revalidatePath(`/admin/customers/${userId}`);
}

export async function createPortalQuotationRequest(formData:FormData){
  const{context,portal}=await requireClientPortal();
  const catalogueItems=Array.from({length:4},(_,index)=>{
    const productId=String(formData.get(`productId:${index}`)||"");
    const quantity=Math.max(1,Number(formData.get(`productQuantity:${index}`)||1));
    return productId?{productId,requestedQuantity:quantity}:null;
  }).filter((item):item is {productId:string;requestedQuantity:number}=>Boolean(item));
  const requestedItems=Array.from({length:4},(_,index)=>{
    const productName=String(formData.get(`requestedName:${index}`)||"").trim();
    const quantity=Math.max(1,Number(formData.get(`requestedQuantity:${index}`)||1));
    const notes=String(formData.get(`requestedNotes:${index}`)||"").trim();
    return productName?{productName,requestedQuantity:quantity,notes:notes||null}:null;
  }).filter((item):item is {productName:string;requestedQuantity:number;notes:string|null}=>Boolean(item));
  if(!catalogueItems.length&&!requestedItems.length)throw new Error("Add at least one catalogue or requested product.");
  const productIds=catalogueItems.map(item=>item.productId);
  const products=await prisma.product.findMany({where:{id:{in:productIds},status:"PUBLISHED",deletedAt:null},select:{id:true,name:true}});
  if(products.length!==new Set(productIds).size)throw new Error("One of the selected products is no longer available.");
  const company=portal.customerProfile.company?.companyName??context.user.name??null;
  const requestNumber=`CPR-${Date.now().toString(36).toUpperCase()}`;
  await prisma.quotationRequest.create({data:{
    requestNumber,userId:context.user.id,contactName:context.user.name??context.user.email,email:context.user.email,
    companyName:company,phone:String(formData.get("phone")||"").trim()||null,
    targetDeliveryDate:formData.get("targetDeliveryDate")?new Date(String(formData.get("targetDeliveryDate"))):null,
    requirements:String(formData.get("requirements")||"").trim()||null,
    customerNotes:String(formData.get("customerNotes")||"").trim()||null,
    items:{create:[
      ...catalogueItems.map(item=>({...item,productName:products.find(product=>product.id===item.productId)?.name})),
      ...requestedItems,
    ]},
  }});
  await prisma.auditLog.create({data:{actorId:context.user.id,action:"client-portal.quotation-request.create",entityType:"QuotationRequest",entityId:requestNumber,after:{requestNumber,itemCount:catalogueItems.length+requestedItems.length}}});
  revalidatePath("/portal");revalidatePath("/portal/quotations");
  redirect(`/portal/quotations?submitted=${encodeURIComponent(requestNumber)}`);
}

export async function createPortalSupportRequest(formData:FormData){
  const{context,portal}=await requireClientPortal();
  const subject=z.string().trim().min(3).max(160).parse(formData.get("subject"));
  const message=z.string().trim().min(10).max(10000).parse(formData.get("message"));
  const category=z.string().trim().min(2).max(80).parse(formData.get("category"));
  const ticketNumber=`CPT-${Date.now().toString(36).toUpperCase()}`;
  await prisma.helpDeskTicket.create({data:{ticketNumber,name:context.user.name??context.user.email,email:context.user.email,customerId:context.user.id,companyName:portal.customerProfile.company?.companyName,category,subject,message,sourceChannel:"CLIENT_PORTAL"}});
  await prisma.auditLog.create({data:{actorId:context.user.id,action:"client-portal.support.create",entityType:"HelpDeskTicket",entityId:ticketNumber,after:{ticketNumber,category}}});
  revalidatePath("/portal");revalidatePath("/portal/support");
  redirect(`/portal/support?submitted=${encodeURIComponent(ticketNumber)}`);
}
