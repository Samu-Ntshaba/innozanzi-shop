import { prisma } from "@/lib/prisma";

export async function getCrmCustomFields() {
  try {
    return await prisma.crmCustomField.findMany({ orderBy: { createdAt: "asc" } });
  } catch (error) {
    console.error("CRM custom fields unavailable; continuing with standard customer fields.", error);
    return [];
  }
}
