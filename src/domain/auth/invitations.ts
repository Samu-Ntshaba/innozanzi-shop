"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "./password";
import { requireActivationUser, requirePermission } from "./session";
import { passwordSchema } from "@/schemas/auth";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";
import { generateTemporaryPassword, invitationExpiry } from "./invitation-utils";

export async function inviteUser(formData: FormData) {
  const actor = await requirePermission("users.manage");
  const data = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z.string().trim().max(40).optional(),
    accountType: z.enum(["INTERNAL_EMPLOYEE", "CUSTOMER", "SUPPLIER", "EXTERNAL_COLLABORATOR"]),
    roleId: z.string().uuid(),
    companyId: z.string().uuid().optional().or(z.literal("")),
    departmentId: z.string().uuid().optional().or(z.literal("")),
  }).parse(Object.fromEntries(formData));
  if (await prisma.user.findUnique({ where: { email: data.email } })) throw new Error("An account already exists for this email.");

  const role = await prisma.role.findUniqueOrThrow({ where: { id: data.roleId } });
  const administratorRole = data.accountType === "INTERNAL_EMPLOYEE"
    ? await prisma.role.findUnique({ where: { slug: "administrator" } })
    : null;
  if (data.accountType === "INTERNAL_EMPLOYEE" && !administratorRole) {
    throw new Error("The Administrator role is not configured. Run the database seed before inviting employees.");
  }
  if (role.slug === "super-administrator" && !actor.isSuperAdministrator) throw new Error("Only a Super Administrator may assign that role.");
  const [company, department] = await Promise.all([
    data.companyId ? prisma.companyProfile.findUnique({ where: { id: data.companyId } }) : null,
    data.departmentId ? prisma.department.findUnique({ where: { id: data.departmentId } }) : null,
  ]);
  if (data.departmentId && (!department || (department.companyId && department.companyId !== (data.companyId || null)))) throw new Error("Department does not belong to the selected company.");

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const rawToken = randomBytes(32).toString("base64url");
  const activationTokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = invitationExpiry();

  await enqueueEmail(emailTemplates.userInvitation(data.email, data.name, temporaryPassword, role.name, data.accountType, company?.companyName ?? "Innozanzi", rawToken, expiresAt));
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: {
      email: data.email, name: data.name, phone: data.phone || null, passwordHash,
      status: "INVITED", accountType: data.accountType, companyId: data.companyId || null,
      departmentId: data.departmentId || null, mustChangePassword: true,
      temporaryPasswordExpiresAt: expiresAt,
      customerProfile: data.accountType === "CUSTOMER" ? { create: {} } : undefined,
    } });
    await tx.userRole.create({ data: { userId: user.id, roleId: role.id, assignedBy: actor.user.id } });
    if (administratorRole && administratorRole.id !== role.id) {
      await tx.userRole.create({ data: { userId: user.id, roleId: administratorRole.id, assignedBy: actor.user.id } });
    }
    await tx.userInvitation.create({ data: {
      userId: user.id, invitedById: actor.user.id, roleId: role.id,
      companyId: data.companyId || null, departmentId: data.departmentId || null,
      accountType: data.accountType, activationTokenHash, expiresAt,
    } });
    await tx.auditLog.create({ data: { actorId: actor.user.id, action: "user.invite", entityType: "User", entityId: user.id, after: { email: user.email, accountType: data.accountType, roleId: role.id, companyId: data.companyId || null, departmentId: data.departmentId || null, expiresAt } } });
  });
  redirect("/admin/access-control?invited=1");
}

export async function activateInvitedUser(formData: FormData) {
  const context = await requireActivationUser();
  const data = z.object({
    temporaryPassword: z.string().min(1).max(128),
    password: passwordSchema,
    confirmPassword: z.string(),
  }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." }).parse(Object.fromEntries(formData));
  const invitation = await prisma.userInvitation.findFirst({
    where: { userId: context.user.id, acceptedAt: null, expiresAt: { gt: new Date() } },
    include: { role: true, company: true, department: true, invitedBy: { select: { email: true, name: true } }, user: true },
    orderBy: { createdAt: "desc" },
  });
  if (!invitation?.user.passwordHash || !(await verifyPassword(invitation.user.passwordHash, data.temporaryPassword))) throw new Error("Temporary password is invalid.");
  if (await verifyPassword(invitation.user.passwordHash, data.password)) throw new Error("Choose a new password, different from the temporary password.");
  const activatedAt = new Date();
  const passwordHash = await hashPassword(data.password);

  await enqueueEmail(emailTemplates.userActivated(
    invitation.user.name ?? "Unnamed user", invitation.user.email, invitation.accountType,
    invitation.role.name, invitation.company?.companyName ?? "Innozanzi",
    invitation.department?.name ?? "Not assigned", invitation.invitedBy.name ?? invitation.invitedBy.email,
    invitation.createdAt, activatedAt, invitation.user.id,
  ), invitation.user.id);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: invitation.user.id }, data: {
      passwordHash, status: "ACTIVE", mustChangePassword: false,
      temporaryPasswordExpiresAt: null, passwordChangedAt: activatedAt,
      activatedAt, emailVerified: invitation.user.emailVerified ?? activatedAt,
    } });
    await tx.userInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: activatedAt } });
    await tx.session.deleteMany({ where: { userId: invitation.user.id, id: { not: context.sessionId } } });
    await tx.auditLog.create({ data: { actorId: invitation.user.id, action: "user.activate", entityType: "User", entityId: invitation.user.id, after: { activatedAt, accountType: invitation.accountType, roleId: invitation.roleId } } });
  });
  redirect(context.user.roles.includes("customer") ? "/account" : "/admin");
}
