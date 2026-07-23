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
