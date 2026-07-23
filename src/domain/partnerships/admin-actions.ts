"use server";
import{createHash,randomBytes}from"node:crypto";import{redirect}from"next/navigation";import{revalidatePath}from"next/cache";import{z}from"zod";import{prisma}from"@/lib/prisma";import{requirePermission}from"@/domain/auth/session";import{hashPassword}from"@/domain/auth/password";import{generateTemporaryPassword,invitationExpiry}from"@/domain/auth/invitation-utils";import{enqueueEmail}from"@/integrations/email/outbox";import{emailTemplates}from"@/integrations/email/templates";import{applicationNumber,partnerNumber,reviewDate}from"./service";

export async function createManualPartner(formData:FormData){
  const ctx=await requirePermission("partnership.partner.manage");
  const data=z.object({
    sourceMode:z.enum(["NEW","EXISTING"]),
    userId:z.string().uuid().optional().or(z.literal("")),
    name:z.string().trim().max(120).optional(),
    email:z.string().trim().toLowerCase().email().max(254).optional().or(z.literal("")),
    phone:z.string().trim().max(40).optional(),
    companyName:z.string().trim().max(200).optional(),
    registrationNo:z.string().trim().max(100).optional(),
    partnershipTypeId:z.string().uuid(),
    accountManagerId:z.string().uuid().optional().or(z.literal("")),
    status:z.enum(["APPROVED","CONDITIONALLY_APPROVED"]),
    reason:z.string().trim().min(5).max(2000),
  }).superRefine((value,issue)=>{
    if(value.sourceMode==="EXISTING"&&!value.userId)issue.addIssue({code:"custom",path:["userId"],message:"Select an existing client."});
    if(value.sourceMode==="NEW"&&(!value.name||value.name.length<2))issue.addIssue({code:"custom",path:["name"],message:"Enter the partner's name."});
    if(value.sourceMode==="NEW"&&!value.email)issue.addIssue({code:"custom",path:["email"],message:"Enter the partner's email."});
    if(value.sourceMode==="NEW"&&(!value.companyName||value.companyName.length<2))issue.addIssue({code:"custom",path:["companyName"],message:"Enter the business or trading name."});
  }).parse(Object.fromEntries(formData));
  const [existingClient,type,customerRole]=await Promise.all([
    data.sourceMode==="EXISTING"?prisma.user.findFirst({where:{id:data.userId||undefined,accountType:"CUSTOMER",status:"ACTIVE",emailVerified:{not:null},deletedAt:null},include:{customerProfile:{include:{company:true}}}}):null,
    prisma.partnershipType.findFirst({where:{id:data.partnershipTypeId,isActive:true}}),
    data.sourceMode==="NEW"?prisma.role.findUnique({where:{slug:"customer"}}):null,
  ]);
  if(data.sourceMode==="EXISTING"&&!existingClient?.customerProfile)throw new Error("Select an active registered client, or choose New partner and enter their details here.");
  if(!type)throw new Error("Select an active partnership track.");
  if(data.sourceMode==="NEW"&&!customerRole)throw new Error("The Customer role is not configured. Run the database seed first.");
  const email=data.sourceMode==="NEW"?data.email!:existingClient!.email;
  const name=data.sourceMode==="NEW"?data.name!:existingClient!.name??"Partner";
  const duplicateUser=data.sourceMode==="NEW"?await prisma.user.findUnique({where:{email}}):null;
  if(duplicateUser)throw new Error("An account already exists for this email. Choose Existing client instead.");
  const duplicate=data.sourceMode==="EXISTING"?await prisma.partnership.findFirst({where:{userId:existingClient!.id,status:{in:["APPROVED","CONDITIONALLY_APPROVED","SUSPENDED"]}}}):null;
  if(duplicate)throw new Error("This client already has an active partnership.");
  const appNumber=applicationNumber(),number=partnerNumber(),due=reviewDate(type.reviewFrequencyMonths);
  const temporaryPassword=data.sourceMode==="NEW"?generateTemporaryPassword():null;
  const passwordHash=temporaryPassword?await hashPassword(temporaryPassword):null;
  const rawToken=data.sourceMode==="NEW"?randomBytes(32).toString("base64url"):null;
  const activationTokenHash=rawToken?createHash("sha256").update(rawToken).digest("hex"):null;
  const expiresAt=invitationExpiry();
  if(rawToken&&temporaryPassword)await enqueueEmail(emailTemplates.userInvitation(email,name,temporaryPassword,customerRole!.name,"CUSTOMER",data.companyName!,rawToken,expiresAt));
  await enqueueEmail(emailTemplates.partnershipApplication(email,name,number,data.status,data.reason),existingClient?.id);
  const partner=await prisma.$transaction(async tx=>{
    let client=existingClient;
    if(data.sourceMode==="NEW"){
      client=await tx.user.create({data:{email,name,phone:data.phone||null,passwordHash,status:"INVITED",accountType:"CUSTOMER",mustChangePassword:true,temporaryPasswordExpiresAt:expiresAt,customerProfile:{create:{firstName:name.split(/\s+/)[0],lastName:name.split(/\s+/).slice(1).join(" ")||null,company:{create:{companyName:data.companyName!,registrationNo:data.registrationNo||null}}}}},include:{customerProfile:{include:{company:true}}}});
      await tx.user.update({where:{id:client.id},data:{companyId:client.customerProfile!.company!.id}});
      await tx.userRole.create({data:{userId:client.id,roleId:customerRole!.id,assignedBy:ctx.user.id}});
      await tx.userInvitation.create({data:{userId:client.id,invitedById:ctx.user.id,roleId:customerRole!.id,companyId:client.customerProfile!.company!.id,accountType:"CUSTOMER",activationTokenHash:activationTokenHash!,expiresAt}});
    }
    if(!client?.customerProfile)throw new Error("Customer profile creation failed.");
    const company=client.customerProfile.company;
    const application=await tx.partnershipApplication.create({data:{applicationNumber:appNumber,userId:client.id,partnershipTypeId:type.id,status:data.status,currentStep:11,registeredBusinessName:company?.companyName,tradingName:company?.companyName,registrationNumber:company?.registrationNo,vatNumber:company?.vatNumber,representativeName:client.name,representativePhone:client.phone,termsAcceptedAt:new Date(),accuracyDeclaredAt:new Date(),verificationConsentAt:new Date(),submittedAt:new Date(),reviewerId:ctx.user.id,accountManagerId:data.accountManagerId||null,decisionReason:data.reason,internalNote:data.sourceMode==="NEW"?"Partnership manually created with a new invited customer account.":"Partnership manually created from an existing customer account."}});
    const created=await tx.partnership.create({data:{partnerNumber:number,userId:client.id,partnershipTypeId:type.id,sourceApplicationId:application.id,status:data.status,accountManagerId:data.accountManagerId||null,approvedAt:new Date(),reviewDate:due,renewalDate:due}});
    await tx.partnershipStatusHistory.createMany({data:[{applicationId:application.id,fromStatus:null,toStatus:data.status,actorId:ctx.user.id,reason:data.reason},{partnershipId:created.id,fromStatus:null,toStatus:data.status,actorId:ctx.user.id,reason:data.reason}]});
    await tx.partnershipReview.create({data:{partnershipId:created.id,reviewType:"ANNUAL_REVIEW",dueAt:due}});
    await tx.auditLog.create({data:{actorId:ctx.user.id,action:"partnership.partner.manual-create",entityType:"Partnership",entityId:created.id,after:{partnerNumber:number,applicationNumber:appNumber,userId:client.id,sourceMode:data.sourceMode,track:type.track,status:data.status,reason:data.reason}}});
    return created;
  });
  redirect(`/admin/partnerships/partners/${partner.id}`);
}
export async function addPartnerCommercialTerm(formData:FormData){const ctx=await requirePermission("partnership.pricing.manage");const data=z.object({partnershipId:z.string().uuid(),type:z.enum(["STANDARD_DISCOUNT","CATEGORY_DISCOUNT","PRODUCT_PRICE","QUANTITY_PRICE","PAYMENT_TERMS","DELIVERY_TERMS","SINGLE_ITEM_PERMISSION","OTHER"]),title:z.string().trim().min(3).max(160),value:z.string().trim().min(1).max(1000),minimumQty:z.coerce.number().int().positive().optional(),validUntil:z.coerce.date().optional()}).parse(Object.fromEntries(formData));const term=await prisma.partnerCommercialTerm.create({data:{...data,createdById:ctx.user.id}});await prisma.auditLog.create({data:{actorId:ctx.user.id,action:"partnership.commercial-term.create",entityType:"PartnerCommercialTerm",entityId:term.id,after:{partnershipId:data.partnershipId,type:data.type,title:data.title,value:data.value}}});revalidatePath(`/admin/partnerships/partners/${data.partnershipId}`)}
export async function addPartnerBenefit(formData:FormData){const ctx=await requirePermission("partnership.partner.manage");const data=z.object({partnershipId:z.string().uuid(),name:z.string().trim().min(3).max(160),description:z.string().trim().min(5).max(1000)}).parse(Object.fromEntries(formData));const benefit=await prisma.partnerBenefit.create({data});await prisma.auditLog.create({data:{actorId:ctx.user.id,action:"partnership.benefit.create",entityType:"PartnerBenefit",entityId:benefit.id,after:data}});revalidatePath(`/admin/partnerships/partners/${data.partnershipId}`)}
