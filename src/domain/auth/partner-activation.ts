import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/schemas/auth";
import { hashPassword } from "./password";
import { createSession } from "./session";

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const normalEmail = (email: string) => email.trim().toLowerCase();

async function invitationFor(token: string) {
  if (!token || token.length > 500) return null;
  return prisma.userInvitation.findUnique({
    where: { activationTokenHash: tokenHash(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          deletedAt: true,
          partnerships: { where:{status:{in:["APPROVED","CONDITIONALLY_APPROVED"]}},select: { id: true, status: true }, take: 1 },
        },
      },
    },
  });
}

export async function inspectPartnerActivation(token: string, email: string) {
  const invitation = await invitationFor(token);
  const valid = Boolean(
    invitation &&
      !invitation.acceptedAt &&
      invitation.expiresAt > new Date() &&
      invitation.user.status === "INVITED" &&
      !invitation.user.deletedAt &&
      invitation.user.email === normalEmail(email) &&
      invitation.user.partnerships.some(partnership=>["APPROVED","CONDITIONALLY_APPROVED"].includes(partnership.status)),
  );
  return valid
    ? { valid: true as const, email: invitation!.user.email, name: invitation!.user.name ?? "Sales partner" }
    : { valid: false as const };
}

export async function activatePartnerInvitation(input: {
  token: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const parsed = passwordSchema.safeParse(input.password);
  if (!parsed.success || input.password !== input.confirmPassword) return { ok: false as const, error: "password" as const };
  const invitation = await invitationFor(input.token);
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.expiresAt <= new Date() ||
    invitation.user.status !== "INVITED" ||
    invitation.user.deletedAt ||
    invitation.user.email !== normalEmail(input.email) ||
    !invitation.user.partnerships.some(partnership=>["APPROVED","CONDITIONALLY_APPROVED"].includes(partnership.status))
  ) return { ok: false as const, error: "invalid" as const };

  const activatedAt = new Date();
  const passwordHash = await hashPassword(parsed.data);
  const activated = await prisma.$transaction(async (tx) => {
    const consumed = await tx.userInvitation.updateMany({
      where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: activatedAt } },
      data: { acceptedAt: activatedAt },
    });
    if (consumed.count !== 1) return false;
    await tx.user.update({
      where: { id: invitation.userId },
      data: {
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
        temporaryPasswordExpiresAt: null,
        passwordChangedAt: activatedAt,
        activatedAt,
        emailVerified: activatedAt,
      },
    });
    await tx.session.deleteMany({ where: { userId: invitation.userId } });
    await tx.auditLog.create({
      data: {
        actorId: invitation.userId,
        action: "partner.activate",
        entityType: "User",
        entityId: invitation.userId,
        after: { activatedAt, invitationId: invitation.id },
      },
    });
    return true;
  });
  if (!activated) return { ok: false as const, error: "invalid" as const };
  await createSession(invitation.userId);
  return { ok: true as const, userId: invitation.userId };
}
