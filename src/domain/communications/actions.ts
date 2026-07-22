"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/domain/auth/rate-limit";
import { requirePermission } from "@/domain/auth/session";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates, newsletterToken } from "@/integrations/email/templates";

const email=z.string().trim().toLowerCase().email().max(254);
const supportSchema=z.object({name:z.string().trim().min(2).max(120),email,phone:z.string().trim().max(40).optional(),companyName:z.string().trim().max(160).optional(),category:z.enum(["QUOTATION","ORDER","PAYMENT","PRODUCT","TECHNICAL","ACCOUNT","OTHER"]),subject:z.string().trim().min(4).max(160),message:z.string().trim().min(20).max(5000)});

export async function subscribeNewsletter(formData:FormData){
  const data=z.object({email,name:z.string().trim().max(120).optional()}).parse({email:formData.get("email"),name:formData.get("name")||undefined});
  const existing=await prisma.newsletterSubscriber.findUnique({where:{email:data.email}});
  try {
    await enqueueEmail(emailTemplates.newsletterWelcome(data.email,data.name||"there"));
  } catch (error) {
    console.error("Newsletter welcome email could not be delivered", error);
    redirect("/newsletter/thank-you?delivery=failed");
  }
  await prisma.newsletterSubscriber.upsert({where:{email:data.email},update:{name:data.name||existing?.name,isActive:true,unsubscribedAt:null},create:{email:data.email,name:data.name}});
  redirect("/newsletter/thank-you?delivery=sent");
}

export async function unsubscribeNewsletter(formData:FormData){const data=z.object({email,token:z.string().length(64)}).parse(Object.fromEntries(formData));if(newsletterToken(data.email)!==data.token)throw new Error("Invalid unsubscribe request.");await prisma.newsletterSubscriber.deleteMany({where:{email:data.email}});redirect("/unsubscribe?done=true")}

export async function submitHelpDeskTicket(formData:FormData){
  const data=supportSchema.parse(Object.fromEntries(formData));const requestHeaders=await headers();const ip=requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown";const limit=consumeRateLimit(`helpdesk:${ip}:${data.email}`,5,60*60_000);if(!limit.allowed)throw new Error("Too many support requests. Please try again later.");
  const ticketNumber=`SUP-${Date.now().toString(36).toUpperCase()}`;await Promise.all([enqueueEmail(emailTemplates.helpDeskReceived(data.email,data.name,ticketNumber)),enqueueEmail(emailTemplates.helpDeskSupportAlert(ticketNumber,data.name,data.email,data.subject,data.message))]);
  await prisma.helpDeskTicket.create({data:{ticketNumber,...data,phone:data.phone||null,companyName:data.companyName||null}});
  redirect(`/contact?submitted=${ticketNumber}`);
}

export async function updateHelpDeskTicket(formData:FormData){const ctx=await requirePermission("customers.manage");const{id,status,resolution}=z.object({id:z.string().uuid(),status:z.enum(["OPEN","IN_PROGRESS","WAITING_CUSTOMER","RESOLVED","CLOSED"]),resolution:z.string().trim().max(3000).optional()}).parse(Object.fromEntries(formData));const before=await prisma.helpDeskTicket.findUniqueOrThrow({where:{id},select:{status:true}});await prisma.$transaction([prisma.helpDeskTicket.update({where:{id},data:{status,resolution:resolution||null,resolvedAt:["RESOLVED","CLOSED"].includes(status)?new Date():null,assignedTo:ctx.user.email}}),prisma.auditLog.create({data:{actorId:ctx.user.id,action:"helpdesk.status",entityType:"HelpDeskTicket",entityId:id,before,after:{status,resolution}}})]);revalidatePath("/admin/help-desk")}

export async function createCampaign(formData:FormData){const ctx=await requirePermission("customers.manage");const data=z.object({name:z.string().trim().min(3).max(120),subject:z.string().trim().min(3).max(160),preview:z.string().trim().max(200).optional(),html:z.string().trim().min(10).max(20000)}).parse(Object.fromEntries(formData));const safeHtml=data.html.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/\son\w+\s*=\s*(["']).*?\1/gi,"");const campaign=await prisma.emailCampaign.create({data:{...data,preview:data.preview||null,html:safeHtml}});await prisma.auditLog.create({data:{actorId:ctx.user.id,action:"campaign.create",entityType:"EmailCampaign",entityId:campaign.id,after:{name:campaign.name,subject:campaign.subject}}});revalidatePath("/admin/email-marketing")}

export async function sendCampaign(formData:FormData){const ctx=await requirePermission("customers.manage");const id=z.string().uuid().parse(formData.get("id"));const campaign=await prisma.emailCampaign.findUniqueOrThrow({where:{id}});if(campaign.status!=="DRAFT")throw new Error("Only draft campaigns can be sent.");const subscribers=await prisma.newsletterSubscriber.findMany({where:{isActive:true},select:{email:true},take:5000});const results=await Promise.allSettled(subscribers.map(s=>enqueueEmail(emailTemplates.campaign(s.email,campaign.subject,campaign.preview??campaign.subject,campaign.html,campaign.id))));const failed=results.filter(r=>r.status==="rejected").length;if(failed)throw new Error(`${failed} campaign emails failed; review the email outbox before retrying.`);await prisma.$transaction([prisma.emailCampaign.update({where:{id},data:{status:"SENT",sentAt:new Date()}}),prisma.auditLog.create({data:{actorId:ctx.user.id,action:"campaign.send",entityType:"EmailCampaign",entityId:id,after:{recipients:subscribers.length}}})]);revalidatePath("/admin/email-marketing")}

export async function retryMarketingEmail(formData:FormData){await requirePermission("customers.manage");const id=z.string().uuid().parse(formData.get("id"));const notification=await prisma.notification.findUniqueOrThrow({where:{id}});if(notification.type!=="EMAIL_OUTBOX"||notification.status!=="FAILED")throw new Error("Only failed email deliveries can be retried.");const data=z.object({to:z.string().email(),text:z.string(),idempotencyKey:z.string()}).parse(notification.data);await enqueueEmail({to:data.to,subject:notification.subject??"Innozanzi update",html:notification.body,text:data.text,idempotencyKey:data.idempotencyKey});revalidatePath("/admin/email-marketing")}
