"use server";

import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/domain/auth/rate-limit";
import { getAuthContext, requirePermission, requireUser } from "@/domain/auth/session";
import { enqueueEmail } from "@/integrations/email/outbox";
import {
  emailTemplates,
  newsletterToken,
} from "@/integrations/email/templates";
import { mailDeliveryMode } from "@/integrations/email/provider";

const email = z.string().trim().toLowerCase().email().max(254);
const supportSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  phone: z.string().trim().max(40).optional(),
  companyName: z.string().trim().max(160).optional(),
  category: z.enum([
    "QUOTATION",
    "ORDER",
    "PAYMENT",
    "PRODUCT",
    "TECHNICAL",
    "ACCOUNT",
    "OTHER",
  ]),
  subject: z.string().trim().min(4).max(160),
  message: z.string().trim().min(20).max(5000),
});

const supportDepartment: Record<z.infer<typeof supportSchema>["category"], string> = {
  QUOTATION: "Sales & Quotations",
  PRODUCT: "Sales & Quotations",
  ORDER: "Order Operations",
  PAYMENT: "Finance",
  TECHNICAL: "Technical Support",
  ACCOUNT: "Customer Care",
  OTHER: "Customer Care",
};

export async function subscribeNewsletter(formData: FormData) {
  const data = z
    .object({ email, name: z.string().trim().max(120).optional() })
    .parse({
      email: formData.get("email"),
      name: formData.get("name") || undefined,
    });
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = consumeRateLimit(
    `newsletter:${ip}:${data.email}`,
    3,
    60 * 60_000,
  );
  if (!limit.allowed)
    throw new Error("Too many subscription attempts. Please try again later.");
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email: data.email },
  });
  if (existing?.isActive) redirect("/newsletter/thank-you?delivery=already");
  try {
    await enqueueEmail(
      emailTemplates.newsletterWelcome(
        data.email,
        data.name || "there",
        randomUUID(),
      ),
    );
  } catch (error) {
    console.error("Newsletter welcome email could not be delivered", error);
    redirect("/newsletter/thank-you?delivery=failed");
  }
  await prisma.newsletterSubscriber.upsert({
    where: { email: data.email },
    update: {
      name: data.name || existing?.name,
      isActive: true,
      unsubscribedAt: null,
    },
    create: { email: data.email, name: data.name },
  });
  redirect(
    `/newsletter/thank-you?delivery=${mailDeliveryMode() === "sandbox" ? "sandbox" : "sent"}`,
  );
}

export async function unsubscribeNewsletter(formData: FormData) {
  const data = z
    .object({ email, token: z.string().length(64) })
    .parse(Object.fromEntries(formData));
  if (newsletterToken(data.email) !== data.token)
    throw new Error("Invalid unsubscribe request.");
  await prisma.newsletterSubscriber.deleteMany({
    where: { email: data.email },
  });
  redirect("/unsubscribe?done=true");
}

export async function submitHelpDeskTicket(formData: FormData) {
  const data = supportSchema.parse(Object.fromEntries(formData));
  const auth = await getAuthContext();
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = consumeRateLimit(
    `helpdesk:${ip}:${data.email}`,
    5,
    60 * 60_000,
  );
  if (!limit.allowed)
    throw new Error("Too many support requests. Please try again later.");
  const ticketNumber = `SUP-${Date.now().toString(36).toUpperCase()}`;
  const departmentName = supportDepartment[data.category];
  const department = await prisma.department.findFirst({ where: { companyId: null, name: departmentName, isActive: true }, select: { id: true } });
  const staffRecipients = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      OR: [
        ...(department ? [{ departmentId: department.id }] : []),
        { roles: { some: { role: { slug: "super-administrator" } } } },
      ],
    },
    select: { email: true },
  });
  const notificationEmails = [...new Set([process.env.SUPPORT_EMAIL ?? "support@innozanzi.co.za", ...staffRecipients.map(({ email }) => email)])];
  await Promise.all([
    enqueueEmail(
      emailTemplates.helpDeskReceived(data.email, data.name, ticketNumber),
    ),
    ...notificationEmails.map((recipient) => enqueueEmail(emailTemplates.helpDeskDepartmentAlert(recipient, ticketNumber, departmentName, data.name, data.email, data.subject, data.message))),
  ]);
  await prisma.helpDeskTicket.create({
    data: {
      ticketNumber,
      ...data,
      customerId: auth?.user.email === data.email ? auth.user.id : null,
      departmentId: department?.id ?? null,
      sourceChannel: "WEB",
      phone: data.phone || null,
      companyName: data.companyName || null,
      activities: { create: { type: "CUSTOMER_MESSAGE", message: data.message } },
    },
  });
  redirect(`/contact?submitted=${ticketNumber}`);
}

export async function createAdminHelpDeskTicket(formData: FormData) {
  const ctx = await requirePermission("customers.manage");
  const data = z.object({
    name: z.string().trim().min(2).max(120),
    email,
    phone: z.string().trim().max(40).optional(),
    companyName: z.string().trim().max(160).optional(),
    departmentId: z.string().uuid(),
    sourceChannel: z.enum(["PHONE", "EMAIL", "WHATSAPP", "WALK_IN", "INTERNAL"]),
    category: z.enum(["QUOTATION","ORDER","PAYMENT","PRODUCT","TECHNICAL","ACCOUNT","OTHER"]),
    subject: z.string().trim().min(4).max(160),
    message: z.string().trim().min(5).max(5000),
    priority: z.enum(["LOW","NORMAL","HIGH","URGENT"]),
  }).parse(Object.fromEntries(formData));
  const department = await prisma.department.findFirstOrThrow({ where: { id: data.departmentId, isActive: true }, select: { id: true, name: true } });
  const customer = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  const recipients = await prisma.user.findMany({ where: { status: "ACTIVE", deletedAt: null, OR: [{ departmentId: department.id }, { roles: { some: { role: { slug: "super-administrator" } } } }] }, select: { email: true } });
  const notificationEmails = [...new Set([process.env.SUPPORT_EMAIL ?? "support@innozanzi.co.za", ...recipients.map(({email})=>email)])];
  const ticketNumber = `SUP-${Date.now().toString(36).toUpperCase()}`;
  await Promise.all([
    enqueueEmail(emailTemplates.helpDeskReceived(data.email, data.name, ticketNumber), customer?.id),
    ...notificationEmails.map(recipient=>enqueueEmail(emailTemplates.helpDeskDepartmentAlert(recipient,ticketNumber,department.name,data.name,data.email,data.subject,data.message))),
  ]);
  const ticket = await prisma.helpDeskTicket.create({ data: { ticketNumber, name:data.name, email:data.email, phone:data.phone||null, companyName:data.companyName||null, departmentId:department.id, sourceChannel:data.sourceChannel, category:data.category, subject:data.subject, message:data.message, priority:data.priority, customerId:customer?.id??null, activities:{create:{actorId:ctx.user.id,type:"TICKET_CAPTURED",message:`Captured from ${data.sourceChannel.replaceAll("_"," ").toLowerCase()} and routed to ${department.name}.`}} } });
  await prisma.auditLog.create({data:{actorId:ctx.user.id,action:"helpdesk.capture",entityType:"HelpDeskTicket",entityId:ticket.id,after:{ticketNumber,department:department.name,sourceChannel:data.sourceChannel}}});
  redirect(`/admin/help-desk/${ticket.id}`);
}

export async function replyToHelpDeskTicket(formData:FormData){
  const ctx=await requireUser();
  const {id,message}=z.object({id:z.string().uuid(),message:z.string().trim().min(2).max(3000)}).parse(Object.fromEntries(formData));
  const ticket=await prisma.helpDeskTicket.findFirst({where:{id,OR:[{customerId:ctx.user.id},{customerId:null,email:{equals:ctx.user.email,mode:"insensitive"}}]},include:{department:true}});
  if(!ticket)throw new Error("Support ticket not found.");
  if(ticket.status==="CLOSED")throw new Error("This ticket is closed. Start a new support request.");
  const recipients=await prisma.user.findMany({where:{status:"ACTIVE",deletedAt:null,OR:[...(ticket.departmentId?[{departmentId:ticket.departmentId}]:[]),{roles:{some:{role:{slug:"super-administrator"}}}}]},select:{email:true}});
  const emails=[...new Set([process.env.SUPPORT_EMAIL??"support@innozanzi.co.za",...recipients.map(x=>x.email)])];
  await Promise.all(emails.map(recipient=>enqueueEmail(emailTemplates.helpDeskCustomerReply(recipient,ticket.ticketNumber,ticket.department?.name??"Customer Care",ticket.name,message))));
  await prisma.$transaction([prisma.helpDeskActivity.create({data:{ticketId:id,actorId:ctx.user.id,type:"CUSTOMER_REPLY",message}}),prisma.helpDeskTicket.update({where:{id},data:{status:"OPEN"}})]);
  revalidatePath(`/account/support/${id}`);
  revalidatePath(`/admin/help-desk/${id}`);
}

export async function updateHelpDeskTicket(formData: FormData) {
  const ctx = await requirePermission("customers.manage");
  const { id, status, resolution, priority, assignedToId, departmentId, dueAt, customerMessage, internalNote } = z
    .object({
      id: z.string().uuid(),
      status: z.enum([
        "OPEN",
        "IN_PROGRESS",
        "WAITING_CUSTOMER",
        "RESOLVED",
        "CLOSED",
      ]),
      resolution: z.string().trim().max(3000).optional(),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
      assignedToId: z.string().uuid().optional(),
      departmentId: z.string().uuid().optional(),
      dueAt: z.coerce.date().optional(),
      customerMessage: z.string().trim().max(3000).optional(),
      internalNote: z.string().trim().max(3000).optional(),
    })
    .parse({ ...Object.fromEntries(formData), assignedToId: formData.get("assignedToId") || undefined, departmentId: formData.get("departmentId") || undefined, dueAt: formData.get("dueAt") || undefined });
  const before = await prisma.helpDeskTicket.findUniqueOrThrow({
    where: { id },
    select: { status: true, email: true, name:true, subject:true, message:true, ticketNumber: true, departmentId:true },
  });
  if (customerMessage) await enqueueEmail(emailTemplates.helpDeskUpdated(before.email, before.ticketNumber, status, customerMessage));
  if(departmentId&&departmentId!==before.departmentId){
    const department=await prisma.department.findUniqueOrThrow({where:{id:departmentId},select:{name:true}});
    const recipients=await prisma.user.findMany({where:{status:"ACTIVE",deletedAt:null,OR:[{departmentId},{roles:{some:{role:{slug:"super-administrator"}}}}]},select:{email:true}});
    const emails=[...new Set([process.env.SUPPORT_EMAIL??"support@innozanzi.co.za",...recipients.map(x=>x.email)])];
    await Promise.all(emails.map(recipient=>enqueueEmail(emailTemplates.helpDeskDepartmentAlert(recipient,before.ticketNumber,department.name,before.name,before.email,before.subject,before.message))));
  }
  await prisma.$transaction([
    prisma.helpDeskTicket.update({
      where: { id },
      data: {
        status,
        priority,
        assignedToId: assignedToId || null,
        departmentId: departmentId || null,
        dueAt: dueAt || null,
        resolution: resolution || null,
        resolvedAt: ["RESOLVED", "CLOSED"].includes(status) ? new Date() : null,
        assignedTo: ctx.user.email,
      },
    }),
    ...(customerMessage ? [prisma.helpDeskActivity.create({ data: { ticketId: id, actorId: ctx.user.id, type: "STAFF_REPLY", message: customerMessage } })] : []),
    ...(internalNote ? [prisma.helpDeskActivity.create({ data: { ticketId: id, actorId: ctx.user.id, type: "INTERNAL_NOTE", message: internalNote, isInternal: true } })] : []),
    prisma.auditLog.create({
      data: {
        actorId: ctx.user.id,
        action: "helpdesk.status",
        entityType: "HelpDeskTicket",
        entityId: id,
        before,
        after: { status, resolution },
      },
    }),
  ]);
  revalidatePath("/admin/help-desk");
  revalidatePath(`/admin/help-desk/${id}`);
}

export async function createServiceTask(formData: FormData) {
  const ctx = await requirePermission("customers.manage");
  const data = z.object({ ticketId: z.string().uuid().optional(), title: z.string().trim().min(3).max(160), description: z.string().trim().max(3000).optional(), priority: z.enum(["LOW","NORMAL","HIGH","URGENT"]), assignedToId: z.string().uuid().optional(), dueAt: z.coerce.date().optional() }).parse({ ...Object.fromEntries(formData), ticketId: formData.get("ticketId") || undefined, assignedToId: formData.get("assignedToId") || undefined, dueAt: formData.get("dueAt") || undefined });
  const assignee = data.assignedToId ? await prisma.user.findUnique({ where: { id: data.assignedToId }, select: { email: true } }) : null;
  const ticket = data.ticketId ? await prisma.helpDeskTicket.findUnique({ where: { id: data.ticketId }, select: { ticketNumber: true } }) : null;
  if (assignee) await enqueueEmail(emailTemplates.serviceTaskAssigned(assignee.email, data.title, ticket?.ticketNumber, data.dueAt));
  await prisma.serviceTask.create({ data: { ...data, ticketId: data.ticketId || null, assignedToId: data.assignedToId || null, description: data.description || null, dueAt: data.dueAt || null, createdById: ctx.user.id } });
  revalidatePath("/admin/help-desk");
  revalidatePath("/admin/calendar");
}

export async function updateServiceTask(formData: FormData) {
  await requirePermission("customers.manage");
  const { id, status } = z.object({ id: z.string().uuid(), status: z.enum(["OPEN","IN_PROGRESS","BLOCKED","COMPLETED","CANCELLED"]) }).parse(Object.fromEntries(formData));
  await prisma.serviceTask.update({ where: { id }, data: { status, completedAt: status === "COMPLETED" ? new Date() : null } });
  revalidatePath("/admin/help-desk");
  revalidatePath("/admin/calendar");
}

export async function createCampaign(formData: FormData) {
  const ctx = await requirePermission("customers.manage");
  const data = z
    .object({
      name: z.string().trim().min(3).max(120),
      subject: z.string().trim().min(3).max(160),
      preview: z.string().trim().max(200).optional(),
      html: z.string().trim().min(10).max(20000),
    })
    .parse(Object.fromEntries(formData));
  const safeHtml = data.html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "");
  const campaign = await prisma.emailCampaign.create({
    data: { ...data, preview: data.preview || null, html: safeHtml },
  });
  await prisma.auditLog.create({
    data: {
      actorId: ctx.user.id,
      action: "campaign.create",
      entityType: "EmailCampaign",
      entityId: campaign.id,
      after: { name: campaign.name, subject: campaign.subject },
    },
  });
  revalidatePath("/admin/email-marketing");
}

export async function sendCampaign(formData: FormData) {
  const ctx = await requirePermission("customers.manage");
  const id = z.string().uuid().parse(formData.get("id"));
  const campaign = await prisma.emailCampaign.findUniqueOrThrow({
    where: { id },
  });
  if (campaign.status !== "DRAFT")
    throw new Error("Only draft campaigns can be sent.");
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { isActive: true },
    select: { email: true },
    take: 5000,
  });
  const results = await Promise.allSettled(
    subscribers.map((s) =>
      enqueueEmail(
        emailTemplates.campaign(
          s.email,
          campaign.subject,
          campaign.preview ?? campaign.subject,
          campaign.html,
          campaign.id,
        ),
      ),
    ),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed)
    throw new Error(
      `${failed} campaign emails failed; review the email outbox before retrying.`,
    );
  await prisma.$transaction([
    prisma.emailCampaign.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: ctx.user.id,
        action: "campaign.send",
        entityType: "EmailCampaign",
        entityId: id,
        after: { recipients: subscribers.length },
      },
    }),
  ]);
  revalidatePath("/admin/email-marketing");
}

export async function retryMarketingEmail(formData: FormData) {
  await requirePermission("customers.manage");
  const id = z.string().uuid().parse(formData.get("id"));
  const notification = await prisma.notification.findUniqueOrThrow({
    where: { id },
  });
  if (notification.type !== "EMAIL_OUTBOX" || notification.status !== "FAILED")
    throw new Error("Only failed email deliveries can be retried.");
  const data = z
    .object({
      to: z.string().email(),
      text: z.string(),
      idempotencyKey: z.string(),
    })
    .parse(notification.data);
  await enqueueEmail({
    to: data.to,
    subject: notification.subject ?? "Innozanzi update",
    html: notification.body,
    text: data.text,
    idempotencyKey: data.idempotencyKey,
  });
  revalidatePath("/admin/email-marketing");
}
