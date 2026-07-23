"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isProtectedRoleRemoval, PERMISSIONS } from "@/domain/auth/permissions";
import { requirePermission } from "@/domain/auth/session";

const uuid = z.string().uuid();
const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function recordAudit(actorId: string, action: string, entityType: string, entityId: string, before?: object, after?: object) {
  await prisma.auditLog.create({ data: { actorId, action, entityType, entityId, before, after } });
}

export async function createRole(formData: FormData) {
  const context = await requirePermission("users.manage");
  const data = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(300).optional() }).parse(Object.fromEntries(formData));
  const slug = slugify(data.name);
  if (!slug) throw new Error("Role name must contain letters or numbers.");
  const role = await prisma.role.create({ data: { name: data.name, slug, description: data.description || null } });
  await recordAudit(context.user.id, "role.create", "Role", role.id, undefined, { name: role.name, slug });
  revalidatePath("/admin/access-control");
}

export async function saveRoleRules(formData: FormData) {
  const context = await requirePermission("users.manage");
  const roleId = uuid.parse(formData.get("roleId"));
  const role = await prisma.role.findUniqueOrThrow({ where: { id: roleId }, include: { permissions: { include: { permission: true } } } });
  if (role.slug === "super-administrator") throw new Error("The Super Administrator role always has unrestricted access.");

  const permissionRows = await prisma.permission.findMany({ where: { key: { in: [...PERMISSIONS] } } });
  const rules = permissionRows.flatMap((permission) => {
    const effect = formData.get(`permission:${permission.key}`);
    return effect === "ALLOW" || effect === "DENY" ? [{ roleId, permissionId: permission.id, effect: effect as "ALLOW" | "DENY" }] : [];
  });

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (rules.length) await tx.rolePermission.createMany({ data: rules });
    await tx.auditLog.create({ data: { actorId: context.user.id, action: "role.rules.update", entityType: "Role", entityId: roleId, before: { rules: role.permissions.map((item) => ({ key: item.permission.key, effect: item.effect })) }, after: { rules: rules.map((rule) => ({ permissionId: rule.permissionId, effect: rule.effect })) } } });
  });
  revalidatePath("/admin/access-control");
}

export async function assignRole(formData: FormData) {
  const context = await requirePermission("users.manage");
  const { userId, roleId } = z.object({ userId: uuid, roleId: uuid }).parse(Object.fromEntries(formData));
  const role = await prisma.role.findUniqueOrThrow({ where: { id: roleId }, select: { name: true, slug: true } });
  if (role.slug === "super-administrator" && !context.isSuperAdministrator) {
    throw new Error("Only a Super Administrator can assign the Super Administrator role.");
  }
  await prisma.userRole.upsert({ where: { userId_roleId: { userId, roleId } }, update: { assignedBy: context.user.id }, create: { userId, roleId, assignedBy: context.user.id } });
  await recordAudit(context.user.id, "user.role.assign", "User", userId, undefined, { roleId, roleName: role.name });
  revalidatePath("/admin/access-control");
}

export async function removeRoleAssignment(formData: FormData) {
  const context = await requirePermission("users.manage");
  const { userId, roleId } = z.object({ userId: uuid, roleId: uuid }).parse(Object.fromEntries(formData));
  const role = await prisma.role.findUniqueOrThrow({ where: { id: roleId }, select: { name: true, slug: true } });
  if (isProtectedRoleRemoval(context.user.id, userId, role.slug)) throw new Error("You cannot remove your own Super Administrator role.");
  await prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
  await recordAudit(context.user.id, "user.role.remove", "User", userId, { roleId, roleName: role.name }, undefined);
  revalidatePath("/admin/access-control");
}

export async function deleteRole(formData: FormData) {
  const context = await requirePermission("users.manage");
  const roleId = uuid.parse(formData.get("roleId"));
  const role = await prisma.role.findUniqueOrThrow({ where: { id: roleId }, include: { _count: { select: { users: true } } } });
  if (role.isSystem) throw new Error("System roles cannot be deleted.");
  if (role._count.users) throw new Error("Remove all user assignments before deleting this role.");
  await prisma.role.delete({ where: { id: roleId } });
  await recordAudit(context.user.id, "role.delete", "Role", roleId, { name: role.name, slug: role.slug }, undefined);
  revalidatePath("/admin/access-control");
}

export async function deleteUser(formData: FormData) {
  const context = await requirePermission("users.manage");
  if (!context.isSuperAdministrator) throw new Error("Only a Super Administrator can delete user accounts.");
  const userId = uuid.parse(formData.get("userId"));
  if (userId === context.user.id) throw new Error("You cannot delete your own signed-in account.");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  if (user.deletedAt) throw new Error("This user has already been deleted.");
  const isSuper = user.roles.some(({ role }) => role.slug === "super-administrator");
  if (isSuper) {
    const activeSuperAdministrators = await prisma.user.count({ where: { deletedAt: null, status: "ACTIVE", roles: { some: { role: { slug: "super-administrator" } } } } });
    if (activeSuperAdministrators <= 1) throw new Error("The last active Super Administrator cannot be deleted.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.userRole.deleteMany({ where: { userId } });
    await tx.verificationToken.deleteMany({ where: { identifier: user.email } });
    await tx.user.update({ where: { id: userId }, data: { status: "DISABLED", deletedAt: new Date(), passwordHash: null, mustChangePassword: false, temporaryPasswordExpiresAt: null } });
    await tx.auditLog.create({ data: { actorId: context.user.id, action: "user.delete", entityType: "User", entityId: userId, before: { email: user.email, name: user.name, status: user.status, roles: user.roles.map(({ role }) => role.slug) }, after: { status: "DISABLED", accessRevoked: true, historyRetained: true } } });
  });
  revalidatePath("/admin/access-control");
  revalidatePath("/admin/customers");
}

export async function restoreUser(formData: FormData) {
  const context = await requirePermission("users.manage");
  if (!context.isSuperAdministrator) throw new Error("Only a Super Administrator can restore user accounts.");
  const userId = uuid.parse(formData.get("userId"));
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.deletedAt) throw new Error("This user is already active.");
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { status: "PENDING_VERIFICATION", deletedAt: null } }),
    prisma.auditLog.create({ data: { actorId: context.user.id, action: "user.restore", entityType: "User", entityId: userId, before: { status: user.status, deletedAt: user.deletedAt.toISOString() }, after: { status: "PENDING_VERIFICATION" } } }),
  ]);
  revalidatePath("/admin/access-control");
  revalidatePath("/admin/customers");
}
