"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

const uuid = z.string().uuid();
const optionalText = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
};
const fieldKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);

function customValues(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => key.startsWith("custom:"))
      .map(([key, value]) => [key.slice(7), String(value).trim()])
      .filter(([, value]) => value),
  );
}

async function createCustomerRecord(data: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  source: string;
  customFields?: Record<string, string>;
}) {
  const suppliedEmail = data.email?.trim().toLowerCase() || null;
  const email = suppliedEmail ?? `crm-${randomUUID()}@internal.invalid`;
  if (suppliedEmail && await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new Error(`A customer with email ${email} already exists.`);
  }
  return prisma.user.create({
    data: {
      email,
      name: data.name || [data.firstName, data.lastName].filter(Boolean).join(" ") || data.companyName || null,
      phone: data.phone,
      status: "DISABLED",
      accountType: "CUSTOMER",
      customerProfile: {
        create: {
          firstName: data.firstName,
          lastName: data.lastName,
          source: data.source,
          customFields: data.customFields,
          company: data.companyName ? { create: { companyName: data.companyName } } : undefined,
        },
      },
    },
    select: { id: true },
  });
}

export async function createCustomer(formData: FormData) {
  const context = await requirePermission("customers.manage");
  const email = optionalText(formData.get("email"));
  const firstName = optionalText(formData.get("firstName"));
  const lastName = optionalText(formData.get("lastName"));
  const companyName = optionalText(formData.get("companyName"));
  if (!email && !firstName && !lastName && !companyName) throw new Error("Add a name, company, or email.");
  if (email) z.string().email().parse(email);
  const customer = await createCustomerRecord({
    email, firstName, lastName, companyName,
    phone: optionalText(formData.get("phone")),
    source: "MANUAL",
    customFields: customValues(formData),
  });
  await prisma.auditLog.create({ data: { actorId: context.user.id, action: "customer.create", entityType: "User", entityId: customer.id, after: { source: "MANUAL", email } } });
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${customer.id}`);
}

export async function updateCustomer(formData: FormData) {
  const context = await requirePermission("customers.manage");
  const userId = uuid.parse(formData.get("userId"));
  const current = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { customerProfile: { include: { company: true } } } });
  if (!current.customerProfile) throw new Error("Customer profile not found.");
  const email = optionalText(formData.get("email"));
  if (email) z.string().email().parse(email);
  const nextEmail = email?.toLowerCase() ?? (current.email.endsWith("@internal.invalid") ? current.email : current.email);
  const firstName = optionalText(formData.get("firstName"));
  const lastName = optionalText(formData.get("lastName"));
  const companyName = optionalText(formData.get("companyName"));
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { email: nextEmail, name: [firstName, lastName].filter(Boolean).join(" ") || companyName, phone: optionalText(formData.get("phone")) } });
    await tx.customerProfile.update({ where: { userId }, data: { firstName, lastName, customFields: customValues(formData), company: companyName ? { upsert: { create: { companyName }, update: { companyName } } } : current.customerProfile!.company ? { delete: true } : undefined } });
    await tx.auditLog.create({ data: { actorId: context.user.id, action: "customer.update", entityType: "User", entityId: userId, before: { email: current.email, name: current.name }, after: { email: nextEmail, firstName, lastName, companyName } } });
  });
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${userId}`);
}

export async function addCustomerNote(formData: FormData) {
  const context = await requirePermission("customers.manage");
  const customerProfileId = uuid.parse(formData.get("customerProfileId"));
  const body = z.string().trim().min(1).max(5000).parse(formData.get("body"));
  await prisma.customerNote.create({ data: { customerProfileId, body, authorId: context.user.id } });
  revalidatePath(`/admin/customers/${String(formData.get("userId"))}`);
}

export async function createCustomField(formData: FormData) {
  await requirePermission("customers.manage");
  const label = z.string().trim().min(1).max(80).parse(formData.get("label"));
  const key = fieldKey(label);
  if (!key) throw new Error("Column name must contain letters or numbers.");
  await prisma.crmCustomField.create({ data: { key, label } });
  revalidatePath("/admin/customers");
  revalidatePath("/admin/customers/new");
}

const importRow = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
});

export async function importCustomers(formData: FormData) {
  const context = await requirePermission("customers.manage");
  const rows = z.array(importRow).min(1).max(2000).parse(JSON.parse(z.string().parse(formData.get("rows"))));
  const newFields = z.array(z.object({ key: z.string().min(1).max(60), label: z.string().min(1).max(80) })).max(100).parse(JSON.parse(String(formData.get("newFields") || "[]")));
  for (const field of newFields) {
    await prisma.crmCustomField.upsert({ where: { key: field.key }, create: field, update: { label: field.label } });
  }
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const email = row.email?.trim().toLowerCase();
    if (!email && !row.firstName && !row.lastName && !row.name && !row.companyName) { skipped++; continue; }
    if (email && !z.string().email().safeParse(email).success) { skipped++; continue; }
    if (email && await prisma.user.findUnique({ where: { email }, select: { id: true } })) { skipped++; continue; }
    await createCustomerRecord({ ...row, email, source: "IMPORT" });
    created++;
  }
  await prisma.auditLog.create({ data: { actorId: context.user.id, action: "customer.import", entityType: "CustomerProfile", after: { created, skipped } } });
  revalidatePath("/admin/customers");
  redirect(`/admin/customers?imported=${created}&skipped=${skipped}`);
}
