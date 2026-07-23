"use server";
import{redirect}from"next/navigation";import{revalidatePath}from"next/cache";import{z}from"zod";import{prisma}from"@/lib/prisma";import{requirePermission}from"@/domain/auth/session";import{enqueueEmail}from"@/integrations/email/outbox";import{emailTemplates}from"@/integrations/email/templates";import{applicationNumber,partnerNumber,reviewDate}from"./service";

export async function createManualPartner(formData:FormData){
  const ctx=await requirePermission("partnership.partner.manage");
  const data=z.object({userId:z.string().uuid(),partnershipTypeId:z.string().uuid(),accountManagerId:z.string().uuid().optional().or(z.literal("")),status:z.enum(["APPROVED","CONDITIONALLY_APPROVED"]),reason:z.string().trim().min(5).max(2000)}).parse(Object.fromEntries(formData));
  const [client,type,duplicate]=await Promise.all([
    prisma.user.findFirst({where:{id:data.userId,accountType:"CUSTOMER",status:"ACTIVE",emailVerified:{not:null},deletedAt:null},include:{customerProfile:{include:{company:true}}}}),
    prisma.partnershipType.findFirst({where:{id:data.partnershipTypeId,isActive:true}}),
    prisma.partnership.findFirst({where:{userId:data.userId,status:{in:["APPROVED","CONDITIONALLY_APPROVED","SUSPENDED"]}}}),
  ]);
  if(!client?.customerProfile)throw new Error("Select an active, verified registered client with a customer profile.");
  if(!type)throw new Error("Select an active partnership track.");
  if(duplicate)throw new Error("This client already has an active partnership.");
  const appNumber=applicationNumber(),number=partnerNumber(),due=reviewDate(type.reviewFrequencyMonths);
  await enqueueEmail(emailTemplates.partnershipApplication(client.email,client.name??"Partner",number,data.status,data.reason),client.id);
  const partner=await prisma.$transaction(async tx=>{
    const application=await tx.partnershipApplication.create({data:{applicationNumber:appNumber,userId:client.id,partnershipTypeId:type.id,status:data.status,currentStep:11,registeredBusinessName:client.customerProfile?.company?.companyName,tradingName:client.customerProfile?.company?.companyName,registrationNumber:client.customerProfile?.company?.registrationNo,vatNumber:client.customerProfile?.company?.vatNumber,representativeName:client.name,representativePhone:client.phone,termsAcceptedAt:new Date(),accuracyDeclaredAt:new Date(),verificationConsentAt:new Date(),submittedAt:new Date(),reviewerId:ctx.user.id,accountManagerId:data.accountManagerId||null,decisionReason:data.reason,internalNote:"Partnership manually created by an authorised administrator."}});
    const created=await tx.partnership.create({data:{partnerNumber:number,userId:client.id,partnershipTypeId:type.id,sourceApplicationId:application.id,status:data.status,accountManagerId:data.accountManagerId||null,approvedAt:new Date(),reviewDate:due,renewalDate:due}});
    await tx.partnershipStatusHistory.createMany({data:[{applicationId:application.id,fromStatus:null,toStatus:data.status,actorId:ctx.user.id,reason:data.reason},{partnershipId:created.id,fromStatus:null,toStatus:data.status,actorId:ctx.user.id,reason:data.reason}]});
    await tx.partnershipReview.create({data:{partnershipId:created.id,reviewType:"ANNUAL_REVIEW",dueAt:due}});
    await tx.auditLog.create({data:{actorId:ctx.user.id,action:"partnership.partner.manual-create",entityType:"Partnership",entityId:created.id,after:{partnerNumber:number,applicationNumber:appNumber,userId:client.id,track:type.track,status:data.status,reason:data.reason}}});
    return created;
  });
  redirect(`/admin/partnerships/partners/${partner.id}`);
}
export async function addPartnerCommercialTerm(formData:FormData){const ctx=await requirePermission("partnership.pricing.manage");const data=z.object({partnershipId:z.string().uuid(),type:z.enum(["STANDARD_DISCOUNT","CATEGORY_DISCOUNT","PRODUCT_PRICE","QUANTITY_PRICE","PAYMENT_TERMS","DELIVERY_TERMS","SINGLE_ITEM_PERMISSION","OTHER"]),title:z.string().trim().min(3).max(160),value:z.string().trim().min(1).max(1000),minimumQty:z.coerce.number().int().positive().optional(),validUntil:z.coerce.date().optional()}).parse(Object.fromEntries(formData));const term=await prisma.partnerCommercialTerm.create({data:{...data,createdById:ctx.user.id}});await prisma.auditLog.create({data:{actorId:ctx.user.id,action:"partnership.commercial-term.create",entityType:"PartnerCommercialTerm",entityId:term.id,after:{partnershipId:data.partnershipId,type:data.type,title:data.title,value:data.value}}});revalidatePath(`/admin/partnerships/partners/${data.partnershipId}`)}
export async function addPartnerBenefit(formData:FormData){const ctx=await requirePermission("partnership.partner.manage");const data=z.object({partnershipId:z.string().uuid(),name:z.string().trim().min(3).max(160),description:z.string().trim().min(5).max(1000)}).parse(Object.fromEntries(formData));const benefit=await prisma.partnerBenefit.create({data});await prisma.auditLog.create({data:{actorId:ctx.user.id,action:"partnership.benefit.create",entityType:"PartnerBenefit",entityId:benefit.id,after:data}});revalidatePath(`/admin/partnerships/partners/${data.partnershipId}`)}
