import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export function authorisedN8n(request: Request) {
  const expected = process.env.N8N_LINKEDIN_WEBHOOK_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const linkedinResultSchema = z.object({
  candidateId: z.string().uuid(),
  status: z.enum(["PUBLISHED", "REJECTED", "FAILED"]),
  postId: z.string().trim().max(300).optional(),
  postUrl: z.string().url().max(1_000).optional(),
  caption: z.string().trim().max(3_000).optional(),
  error: z.string().trim().max(1_000).optional(),
});

const clean = (value: string | null) => (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function nextLinkedinCandidate() {
  const { prisma } = await import("@/lib/prisma");
  const cutoff = new Date(Date.now() - 90 * 86_400_000);
  const used = await prisma.auditLog.findMany({
    where: { action: "social.linkedin.published", entityType: "SupplierCatalogueProduct", createdAt: { gte: cutoff }, entityId: { not: null } },
    select: { entityId: true },
  });
  const excludedIds = used.flatMap(entry => entry.entityId ? [entry.entityId] : []);
  const product = await prisma.supplierCatalogueProduct.findFirst({
    where: { active: true, availability: "IN_STOCK", stock: { gt: 0 }, images: { isEmpty: false }, ...(excludedIds.length ? { id: { notIn: excludedIds } } : {}) },
    orderBy: [{ sourceUpdatedAt: "desc" }, { stock: "desc" }],
    select: { id: true, name: true, slug: true, supplierSku: true, manufacturerSku: true, brand: true, category: true, shortDescription: true, images: true, warranty: true },
  });
  if (!product) return null;

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.innozanzi.co.za").replace(/\/$/, "");
  const productUrl = `${site}/supplier-products/${product.slug}`;
  const detail = clean(product.shortDescription).slice(0, 220);
  const caption = [
    `${product.brand ?? "Business technology"}: ${product.name}`,
    detail || "A practical technology option for South African organisations. Availability and commercial terms are confirmed with every quotation.",
    "Tell us what your team needs and Innozanzi will confirm availability, delivery and a tailored business quotation.",
    productUrl,
    "#BusinessTechnology #SouthAfrica #Innozanzi",
  ].join("\n\n");

  return {
    candidateId: product.id,
    contentType: "PRODUCT_SPOTLIGHT",
    brand: product.brand,
    category: product.category,
    productName: product.name,
    sku: product.supplierSku,
    manufacturerSku: product.manufacturerSku,
    warranty: product.warranty,
    imageUrl: product.images[0],
    productUrl,
    caption,
    approvalRequired: true,
  };
}

export async function recordLinkedinResult(input: z.infer<typeof linkedinResultSchema>) {
  const { prisma } = await import("@/lib/prisma");
  const action = input.status === "PUBLISHED" ? "social.linkedin.published" : input.status === "REJECTED" ? "social.linkedin.rejected" : "social.linkedin.failed";
  return prisma.auditLog.create({
    data: { action, entityType: "SupplierCatalogueProduct", entityId: input.candidateId, metadata: { channel: "linkedin", postId: input.postId, postUrl: input.postUrl, caption: input.caption, error: input.error, source: "n8n" } },
    select: { id: true, createdAt: true },
  });
}
