"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  registrationSchema,
} from "@/schemas/auth";
import { hashPassword, verifyPassword } from "@/domain/auth/password";
import { clearAuthAttempts, consumeAuthAttempt } from "@/domain/auth/rate-limit";
import { createSession, deleteCurrentSession } from "@/domain/auth/session";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";

function value(formData: FormData, key: string) {
  const field = formData.get(key);
  return typeof field === "string" ? field : "";
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({ email: value(formData, "email"), password: value(formData, "password") });
  if (!parsed.success) redirect("/sign-in?error=invalid");

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitKey = `${ip}:${parsed.data.email}`;
  if (!consumeAuthAttempt(rateLimitKey)) redirect("/sign-in?error=rate-limited");

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true, status: true },
  });
  const valid = Boolean(
    user?.passwordHash &&
      user.status === "ACTIVE" &&
      (await verifyPassword(user.passwordHash, parsed.data.password)),
  );
  if (!user || !valid) redirect("/sign-in?error=invalid");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  clearAuthAttempts(rateLimitKey);
  await createSession(user.id);
  redirect("/account");
}

export async function registerAction(formData: FormData) {
  const parsed = registrationSchema.safeParse({
    name: value(formData, "name"),
    email: value(formData, "email"),
    phone: value(formData, "phone"),
    password: value(formData, "password"),
    confirmPassword: value(formData, "confirmPassword"),
  });
  if (!parsed.success) redirect("/register?error=invalid");

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (existing) redirect("/register?status=check-email");

  const passwordHash = await hashPassword(parsed.data.password);
  const rawToken = randomBytes(32).toString("base64url");
  const token = createHash("sha256").update(rawToken).digest("hex");

  const user = await prisma.$transaction(async (tx) => {
    const customerRole = await tx.role.findUnique({ where: { slug: "customer" } });
    const user = await tx.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        passwordHash,
        customerProfile: { create: {} },
      },
    });
    if (customerRole) {
      await tx.userRole.create({ data: { userId: user.id, roleId: customerRole.id } });
    }
    await tx.verificationToken.create({
      data: {
        identifier: `verify:${parsed.data.email}`,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1_000),
      },
    });
    return user;
  });
  await enqueueEmail(emailTemplates.verifyEmail(parsed.data.email, parsed.data.name, rawToken), user.id);
  redirect("/register?status=check-email");
}

export async function logoutAction() {
  await deleteCurrentSession();
  redirect("/sign-in");
}

export async function verifyEmailAction(formData: FormData) {
  const email = value(formData, "email").trim().toLowerCase();
  const rawToken = value(formData, "token");
  if (!email || rawToken.length < 32) redirect("/verify-email?error=invalid");

  const token = createHash("sha256").update(rawToken).digest("hex");
  const verification = await prisma.verificationToken.findUnique({ where: { token } });
  if (
    !verification ||
    verification.identifier !== `verify:${email}` ||
    verification.expires <= new Date()
  ) {
    redirect("/verify-email?error=invalid");
  }

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { email },
      data: { status: "ACTIVE", emailVerified: new Date() },
      select: { id: true },
    });
    await tx.verificationToken.delete({ where: { token } });
    return updated;
  });
  await createSession(user.id);
  redirect("/account");
}

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = passwordResetRequestSchema.safeParse({ email: value(formData, "email") });
  if (parsed.success) {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (user) {
      const rawToken = randomBytes(32).toString("base64url");
      const token = createHash("sha256").update(rawToken).digest("hex");
      await prisma.$transaction(async (tx) => {
        await tx.verificationToken.deleteMany({ where: { identifier: `reset:${parsed.data.email}` } });
        await tx.verificationToken.create({
          data: {
            identifier: `reset:${parsed.data.email}`,
            token,
            expires: new Date(Date.now() + 60 * 60 * 1_000),
          },
        });
      });
      await enqueueEmail(emailTemplates.passwordReset(parsed.data.email, rawToken), user.id);
    }
  }
  redirect("/forgot-password?status=sent");
}

export async function resetPasswordAction(formData: FormData) {
  const parsed = passwordResetSchema.safeParse({
    email: value(formData, "email"),
    token: value(formData, "token"),
    password: value(formData, "password"),
    confirmPassword: value(formData, "confirmPassword"),
  });
  if (!parsed.success) redirect("/reset-password?error=invalid");

  const token = createHash("sha256").update(parsed.data.token).digest("hex");
  const reset = await prisma.verificationToken.findUnique({ where: { token } });
  if (!reset || reset.identifier !== `reset:${parsed.data.email}` || reset.expires <= new Date()) {
    redirect("/reset-password?error=invalid");
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { email: parsed.data.email },
      data: { passwordHash, passwordChangedAt: new Date() },
      select: { id: true },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.verificationToken.delete({ where: { token } });
  });
  redirect("/sign-in?status=password-reset");
}
