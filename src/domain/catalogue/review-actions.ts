"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  sourceType: z.enum(["LOCAL", "SUPPLIER"]),
  productId: z.string().uuid(),
  returnPath: z.string().startsWith("/").max(500),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(2000),
});

export async function submitProductReview(formData: FormData) {
  const context = await requireUser();
  const data = schema.parse(Object.fromEntries(formData));
  const isLocal = data.sourceType === "LOCAL";
  const exists = isLocal
    ? await prisma.product.findFirst({ where: { id: data.productId, status: "PUBLISHED", deletedAt: null }, select: { id: true } })
    : await prisma.supplierCatalogueProduct.findFirst({ where: { id: data.productId, active: true }, select: { id: true } });
  if (!exists) throw new Error("This product is no longer available for review.");

  const verifiedPurchase = await prisma.orderItem.findFirst({
    where: {
      order: { userId: context.user.id, paymentStatus: "PAID" },
      ...(isLocal ? { productId: data.productId } : { sourceType: "SUPPLIER", sourceId: data.productId }),
    },
    select: { id: true },
  });

  if (isLocal) {
    await prisma.review.upsert({
      where: { productId_userId: { productId: data.productId, userId: context.user.id } },
      create: { productId: data.productId, userId: context.user.id, rating: data.rating, title: data.title, body: data.body, isVerifiedPurchase: Boolean(verifiedPurchase), status: "PENDING" },
      update: { rating: data.rating, title: data.title, body: data.body, isVerifiedPurchase: Boolean(verifiedPurchase), status: "PENDING" },
    });
  } else {
    await prisma.review.upsert({
      where: { supplierCatalogueProductId_userId: { supplierCatalogueProductId: data.productId, userId: context.user.id } },
      create: { supplierCatalogueProductId: data.productId, userId: context.user.id, rating: data.rating, title: data.title, body: data.body, isVerifiedPurchase: Boolean(verifiedPurchase), status: "PENDING" },
      update: { rating: data.rating, title: data.title, body: data.body, isVerifiedPurchase: Boolean(verifiedPurchase), status: "PENDING" },
    });
  }
  revalidatePath(data.returnPath);
  redirect(`${data.returnPath}?review=submitted#reviews`);
}
