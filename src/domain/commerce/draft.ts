import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { commerceSchema, type CommerceSettings } from "./config";

export type PricingDraft = {
  settings: CommerceSettings;
  version: string;
  savedAt: string;
  savedBy: string;
};

export async function getPricingDraft(): Promise<PricingDraft | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key: "commerce.pricing.draft" } });
  if (!row) return null;
  const parsed = commerceSchema.safeParse(row.value);
  if (!parsed.success) throw new Error("The stored pricing draft is invalid. Save a new draft before publishing.");
  // Metadata travels with the settings in one atomic row read.
  const stored=z.object({_draft:z.object({version:z.string(),savedAt:z.iso.datetime(),savedBy:z.string()})}).safeParse(row.value);
  if(stored.success)return {settings:parsed.data,...stored.data._draft};
  const audit = await prisma.auditLog.findFirst({
    where: { action: "commerce.pricing.draft", entityId: "commerce.pricing.draft" },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, actor: { select: { name: true, email: true } } },
  });
  return {
    settings: parsed.data,
    version: audit?.id ?? row.id,
    savedAt: (audit?.createdAt ?? row.updatedAt).toISOString(),
    savedBy: audit?.actor?.name ?? audit?.actor?.email ?? "Administrator",
  };
}
