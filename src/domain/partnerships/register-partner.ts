import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { invitationExpiry } from "@/domain/auth/invitation-utils";
import { notifySupportOfNewUser } from "@/domain/auth/user-notifications";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates, partnerInvitationEmail } from "@/integrations/email/templates";
import { applicationNumber, partnerNumber, reviewDate } from "./service";

export const registerSalesPartnerSchema = z.object({
  sourceMode: z.enum(["NEW", "EXISTING"]),
  userId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  companyName: z.string().trim().max(200).optional(),
  registrationNo: z.string().trim().max(100).optional(),
  partnershipTypeId: z.string().uuid(),
  accountManagerId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["APPROVED", "CONDITIONALLY_APPROVED"]),
  reason: z.string().trim().min(5).max(2000),
}).superRefine((value, issue) => {
  if (value.sourceMode === "EXISTING" && !value.userId) issue.addIssue({ code: "custom", path: ["userId"], message: "Select an existing client." });
  if (value.sourceMode === "NEW" && (!value.name || value.name.length < 2)) issue.addIssue({ code: "custom", path: ["name"], message: "Enter the partner's name." });
  if (value.sourceMode === "NEW" && !value.email) issue.addIssue({ code: "custom", path: ["email"], message: "Enter the partner's email." });
  if (value.sourceMode === "NEW" && (!value.companyName || value.companyName.length < 2)) issue.addIssue({ code: "custom", path: ["companyName"], message: "Enter the business or trading name." });
});

type RegistrationInput = z.infer<typeof registerSalesPartnerSchema>;
type Actor = { id: string; name?: string | null; email: string };

export async function registerSalesPartner(input: RegistrationInput, actor: Actor, database: typeof prisma = prisma) {
  const data = registerSalesPartnerSchema.parse(input);
  const [existingClient, type, customerRole] = await Promise.all([
    data.sourceMode === "EXISTING" ? database.user.findFirst({
      where: { id: data.userId || undefined, accountType: "CUSTOMER", status: "ACTIVE", emailVerified: { not: null }, deletedAt: null },
      include: { customerProfile: { include: { company: true } } },
    }) : null,
    database.partnershipType.findFirst({ where: { id: data.partnershipTypeId, isActive: true } }),
    data.sourceMode === "NEW" ? database.role.findUnique({ where: { slug: "customer" } }) : null,
  ]);
  if (data.sourceMode === "EXISTING" && !existingClient?.customerProfile) throw new Error("Select an active registered client, or register a new partner.");
  if (!type) throw new Error("Select an active partnership track.");
  if (data.sourceMode === "NEW" && !customerRole) throw new Error("The Customer role is not configured.");

  const email = data.sourceMode === "NEW" ? data.email! : existingClient!.email;
  const name = data.sourceMode === "NEW" ? data.name! : existingClient!.name ?? "Partner";
  if (data.sourceMode === "NEW" && await database.user.findUnique({ where: { email } })) throw new Error("An account already exists for this email. Choose Existing client instead.");
  if (data.sourceMode === "EXISTING" && await database.partnership.findFirst({ where: { userId: existingClient!.id, status: { in: ["APPROVED", "CONDITIONALLY_APPROVED", "SUSPENDED"] } } })) throw new Error("This client already has an active partnership.");

  const appNumber = applicationNumber();
  const number = partnerNumber();
  const due = reviewDate(type.reviewFrequencyMonths);
  const rawToken = data.sourceMode === "NEW" ? randomBytes(32).toString("base64url") : null;
  const expiresAt = invitationExpiry();

  const result = await database.$transaction(async (tx) => {
    let client = existingClient;
    if (data.sourceMode === "NEW") {
      client = await tx.user.create({
        data: {
          email, name, phone: data.phone || null, passwordHash: null, status: "INVITED", accountType: "CUSTOMER",
          mustChangePassword: true, temporaryPasswordExpiresAt: expiresAt,
          customerProfile: { create: { firstName: name.split(/\s+/)[0], lastName: name.split(/\s+/).slice(1).join(" ") || null, source: "ADMIN_PARTNER_CREATION", company: { create: { companyName: data.companyName!, registrationNo: data.registrationNo || null } } } },
        },
        include: { customerProfile: { include: { company: true } } },
      });
      await tx.user.update({ where: { id: client.id }, data: { companyId: client.customerProfile!.company!.id } });
      await tx.userRole.create({ data: { userId: client.id, roleId: customerRole!.id, assignedBy: actor.id } });
      await tx.userInvitation.create({ data: {
        userId: client.id, invitedById: actor.id, roleId: customerRole!.id, companyId: client.customerProfile!.company!.id,
        accountType: "CUSTOMER", activationTokenHash: createHash("sha256").update(rawToken!).digest("hex"), expiresAt,
      } });
    }
    if (!client?.customerProfile) throw new Error("Customer profile creation failed.");
    const company = client.customerProfile.company;
    const application = await tx.partnershipApplication.create({ data: {
      applicationNumber: appNumber, userId: client.id, partnershipTypeId: type.id, status: data.status, currentStep: 11,
      registeredBusinessName: company?.companyName, tradingName: company?.companyName, registrationNumber: company?.registrationNo,
      vatNumber: company?.vatNumber, representativeName: client.name, representativePhone: client.phone, termsAcceptedAt: new Date(),
      accuracyDeclaredAt: new Date(), verificationConsentAt: new Date(), submittedAt: new Date(), reviewerId: actor.id,
      accountManagerId: data.accountManagerId || null, decisionReason: data.reason,
      internalNote: data.sourceMode === "NEW" ? "Sales partnership registered with a new invited customer account." : "Sales partnership registered from an existing customer account.",
    } });
    const partner = await tx.partnership.create({ data: {
      partnerNumber: number, userId: client.id, partnershipTypeId: type.id, sourceApplicationId: application.id,
      status: data.status, accountManagerId: data.accountManagerId || null, approvedAt: new Date(), reviewDate: due, renewalDate: due,
    } });
    await tx.partnershipStatusHistory.createMany({ data: [
      { applicationId: application.id, fromStatus: null, toStatus: data.status, actorId: actor.id, reason: data.reason },
      { partnershipId: partner.id, fromStatus: null, toStatus: data.status, actorId: actor.id, reason: data.reason },
    ] });
    await tx.partnershipReview.create({ data: { partnershipId: partner.id, reviewType: "ANNUAL_REVIEW", dueAt: due } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "partnership.partner.register", entityType: "Partnership", entityId: partner.id, after: { partnerNumber: number, applicationNumber: appNumber, userId: client.id, sourceMode: data.sourceMode, track: type.track, status: data.status } } });
    return { partnerId: partner.id, userId: client.id, companyName: company?.companyName ?? data.companyName ?? "Sales partner" };
  });

  if (rawToken) {
    await enqueueEmail(partnerInvitationEmail({ to: email, name, company: result.companyName, token: rawToken, expiresAt }), result.userId);
    await notifySupportOfNewUser({ userId: result.userId, name, email, accountType: "CUSTOMER", source: "ADMIN_PARTNER_CREATION", createdBy: actor.name ?? actor.email });
  } else {
    await enqueueEmail(emailTemplates.partnershipApplication(email, name, number, data.status, data.reason), result.userId);
  }
  return { partnerId: result.partnerId, invited: Boolean(rawToken) };
}
