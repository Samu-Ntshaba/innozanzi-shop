"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/domain/auth/session";
import { applicationDraftSchema } from "./schemas";
import { applicationNumber, ACTIVE_APPLICATION_STATUSES } from "./service";
import { missingPartnershipFields, partnershipStage } from "./progress";

export type PartnershipFormState = { error?: string };
const list = (value?: string) => value?.split(/[\n,]/).map(item => item.trim()).filter(Boolean) ?? [];
const fieldLabel: Record<string, string> = {
  registeredBusinessName: "registered business name",
  registrationNumber: "company registration number",
  businessAddress: "business address",
  representativeName: "authorised representative",
  representativeRole: "representative role",
  representativePhone: "representative contact number",
  businessProfile: "business profile",
  productCategories: "product categories of interest",
  purchasingFrequency: "purchasing frequency",
};

export async function savePartnershipDraftSecure(_previous: PartnershipFormState, formData: FormData): Promise<PartnershipFormState> {
  const ctx = await requireUser();
  const parsed = applicationDraftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the information you entered and try again." };
  const data = parsed.data;
  const submittedStage = partnershipStage(Number(formData.get("stage")));
  const missing = missingPartnershipFields(submittedStage, Object.fromEntries(formData));
  if (missing.length) return { error: `Add the ${missing.map(key => fieldLabel[key]).join(", ")} before continuing.` };

  const editable = data.applicationId ? await prisma.partnershipApplication.findFirst({ where: { id: data.applicationId, userId: ctx.user.id, status: { in: ["DRAFT", "CHANGES_REQUESTED", "DOCUMENTS_REQUIRED"] } } }) : null;
  if (data.applicationId && !editable) return { error: "This application is no longer editable." };
  if (!editable) {
    const duplicate = await prisma.partnershipApplication.findFirst({ where: { userId: ctx.user.id, status: { in: [...ACTIVE_APPLICATION_STATUSES] } } });
    if (duplicate) redirect(`/account/partnership/apply?application=${duplicate.id}`);
  }

  const present = (name: string) => formData.has(name);
  const text = (name: string, value: string | undefined, existing: string | null) => present(name) ? value || null : existing;
  const array = (name: string, value: string | undefined, existing: string[]) => present(name) ? list(value) : existing;
  const payload = {
    partnershipTypeId: data.partnershipTypeId,
    currentStep: partnershipStage(data.currentStep),
    registeredBusinessName: text("registeredBusinessName", data.registeredBusinessName, editable?.registeredBusinessName ?? null),
    tradingName: text("tradingName", data.tradingName, editable?.tradingName ?? null),
    registrationNumber: text("registrationNumber", data.registrationNumber, editable?.registrationNumber ?? null),
    vatNumber: text("vatNumber", data.vatNumber, editable?.vatNumber ?? null),
    businessAddress: text("businessAddress", data.businessAddress, editable?.businessAddress ?? null),
    representativeName: text("representativeName", data.representativeName, editable?.representativeName ?? null),
    representativeRole: text("representativeRole", data.representativeRole, editable?.representativeRole ?? null),
    representativePhone: text("representativePhone", data.representativePhone, editable?.representativePhone ?? null),
    businessProfile: text("businessProfile", data.businessProfile, editable?.businessProfile ?? null),
    productCategories: array("productCategories", data.productCategories, editable?.productCategories ?? []),
    purchasingFrequency: text("purchasingFrequency", data.purchasingFrequency, editable?.purchasingFrequency ?? null),
    estimatedMonthlyValue: present("estimatedMonthlyValue") ? data.estimatedMonthlyValue : editable?.estimatedMonthlyValue ?? null,
    salesChannels: array("salesChannels", data.salesChannels, editable?.salesChannels ?? []),
    marketplaceLinks: array("marketplaceLinks", data.marketplaceLinks, editable?.marketplaceLinks ?? []),
    references: text("references", data.references, editable?.references ?? null),
  };

  let applicationId: string;
  try {
    const application = await prisma.$transaction(async tx => {
      const [profile, user] = await Promise.all([tx.customerProfile.findUnique({ where: { userId: ctx.user.id } }), tx.user.findUnique({ where: { id: ctx.user.id }, select: { name: true, phone: true } })]);
      if (!profile) throw new Error("Complete your customer profile before starting an application.");
      if (user && ((!user.name && payload.representativeName) || (!user.phone && payload.representativePhone))) {
        await tx.user.update({ where: { id: ctx.user.id }, data: { ...(!user.name && payload.representativeName ? { name: payload.representativeName } : {}), ...(!user.phone && payload.representativePhone ? { phone: payload.representativePhone } : {}) } });
      }
      if (payload.registeredBusinessName && payload.registrationNumber) {
        await tx.companyProfile.upsert({ where: { customerProfileId: profile.id }, update: { companyName: payload.registeredBusinessName, registrationNo: payload.registrationNumber, vatNumber: payload.vatNumber }, create: { customerProfileId: profile.id, companyName: payload.registeredBusinessName, registrationNo: payload.registrationNumber, vatNumber: payload.vatNumber } });
      }
      const saved = editable
        ? await tx.partnershipApplication.update({ where: { id: editable.id }, data: payload })
        : await tx.partnershipApplication.create({ data: { applicationNumber: applicationNumber(), activeKey: ctx.user.id, userId: ctx.user.id, status: "DRAFT", ...payload } });
      await tx.partnershipApplicationSection.upsert({ where: { applicationId_sectionKey: { applicationId: saved.id, sectionKey: `stage-${submittedStage}` } }, update: { isComplete: true, completedAt: new Date() }, create: { applicationId: saved.id, sectionKey: `stage-${submittedStage}`, isComplete: true, completedAt: new Date() } });
      return saved;
    }, { isolationLevel: "Serializable" });
    applicationId = application.id;
  } catch (error) {
    console.error("Unable to save partnership application", error);
    return { error: error instanceof Error && error.message.startsWith("Complete your") ? error.message : "We could not save the application. Please try again." };
  }
  redirect(`/account/partnership/apply?application=${applicationId}&stage=${payload.currentStep}&saved=true`);
}
