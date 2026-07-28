"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "./password";
import { requireActivationUser, requirePermission } from "./session";
import { passwordSchema } from "@/schemas/auth";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";
import { generateTemporaryPassword, invitationExpiry } from "./invitation-utils";
import { notifySupportOfNewUser } from "./user-notifications";
import { sendStaffEmail } from "@/domain/notifications/role-email";

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
  const invitedUser = await prisma.$transaction(async (tx) => {
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
    return user;
  });
  await notifySupportOfNewUser({ userId: invitedUser.id, name: invitedUser.name, email: invitedUser.email, accountType: invitedUser.accountType, source: "ADMIN_INVITATION", createdBy: actor.user.name ?? actor.user.email });
  redirect("/admin/access-control?invited=1");
}

export async function activateInvitedUser(formData: FormData) {
  const context = await requireActivationUser();
  const parsed = z.object({
    password: passwordSchema,
    confirmPassword: z.string(),
  }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/activate-account?error=password-requirements");
  const data = parsed.data;
  const invitation = await prisma.userInvitation.findFirst({
    where: { userId: context.user.id, acceptedAt: null, expiresAt: { gt: new Date() } },
    include: { role: true, company: true, department: true, invitedBy: { select: { email: true, name: true } }, user: true },
    orderBy: { createdAt: "desc" },
  });
  if (!invitation?.user.passwordHash) redirect("/sign-in?error=invitation-expired");
  if (await verifyPassword(invitation.user.passwordHash, data.password)) redirect("/activate-account?error=password-reused");
  const activatedAt = new Date();
  const passwordHash = await hashPassword(data.password);

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
  try {
    await sendStaffEmail("USER_ACTIVATED", emailTemplates.userActivated(
      invitation.user.name ?? "Unnamed user", invitation.user.email, invitation.accountType,
      invitation.role.name, invitation.company?.companyName ?? "Innozanzi",
      invitation.department?.name ?? "Not assigned", invitation.invitedBy.name ?? invitation.invitedBy.email,
      invitation.createdAt, activatedAt, invitation.user.id,
    ));
  } catch (error) {
    console.error("Account activated, but the internal activation notification failed.", error);
  }
  redirect(context.user.roles.includes("customer") ? "/account" : "/admin");
}

export async function resendUserInvitation(formData: FormData) {
  const actor = await requirePermission("users.manage");
  const userId = z.string().uuid().parse(formData.get("userId"));
  const user = await prisma.user.findFirst({
    where: { id: userId, status: "INVITED", mustChangePassword: true, deletedAt: null },
    include: {
      invitationsReceived: {
        include: { role: true, company: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  const previous = user?.invitationsReceived[0];
  if (!user || !previous) throw new Error("This user does not have a renewable invitation.");

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const rawToken = randomBytes(32).toString("base64url");
  const activationTokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = invitationExpiry();
  await enqueueEmail(emailTemplates.userInvitation(
    user.email, user.name ?? "Invited user", temporaryPassword, previous.role.name,
    previous.accountType, previous.company?.companyName ?? "Innozanzi", rawToken, expiresAt,
  ), user.id);

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.userInvitation.deleteMany({ where: { userId, acceptedAt: null } });
    await tx.user.update({ where: { id: userId }, data: { passwordHash, temporaryPasswordExpiresAt: expiresAt } });
    await tx.userInvitation.create({ data: {
      userId, invitedById: actor.user.id, roleId: previous.roleId,
      companyId: previous.companyId, departmentId: previous.departmentId,
      accountType: previous.accountType, activationTokenHash, expiresAt,
    } });
    await tx.auditLog.create({ data: {
      actorId: actor.user.id, action: "user.invitation.resend", entityType: "User", entityId: userId,
      after: { expiresAt, roleId: previous.roleId, accountType: previous.accountType },
    } });
  });
  revalidatePath("/admin/access-control");
}
