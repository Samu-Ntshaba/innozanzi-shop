"use server";

import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { sellableSupplierWhere } from "@/integrations/suppliers/availability";
import { prisma } from "@/lib/prisma";
import { priceFromCost } from "./lifecycle";

export async function addQuotationAlternative(formData: FormData) {
  const ctx = await requirePermission("quotations.manage");
  const { quotationId, catalogueReference, quantity } = z.object({ quotationId: z.string().uuid(), catalogueReference: z.string().regex(/^(internal|supplier):[0-9a-f-]{36}$/i), quantity: z.coerce.number().int().positive().max(10000) }).parse(Object.fromEntries(formData));
  const source = catalogueReference.startsWith("supplier:") ? "SUPPLIER" : "LOCAL";
  const sourceId = catalogueReference.split(":")[1];
  await prisma.$transaction(async tx => {
    const quote = await tx.quotation.findUniqueOrThrow({ where: { id: quotationId } });
    if (quote.kind !== "PROVISIONAL") throw new Error("Final quotation items cannot be changed.");
    let item: { productId: string | null; name: string; sku: string; cost: Decimal; supplierId: string | null; supplierSku: string | null; stock: number | null; snapshot: object };
    if (source === "SUPPLIER") {
      const product = await tx.supplierCatalogueProduct.findFirst({ where: { ...await sellableSupplierWhere(), id: sourceId } });
      if (!product || !product.costPrice || product.stock < quantity) throw new Error("The supplier alternative is no longer available in the requested quantity.");
      item = { productId: null, name: product.name, sku: product.supplierSku, cost: new Decimal(product.costPrice.toString()), supplierId: product.supplierId, supplierSku: product.supplierSku, stock: product.stock, snapshot: { slug: product.slug, brand: product.brand, manufacturerSku: product.manufacturerSku, image: product.images[0] ?? null } };
    } else {
      const product = await tx.product.findFirst({ where: { id: sourceId, status: "PUBLISHED", deletedAt: null }, include: { suppliers: { where: { isPreferred: true }, take: 1 } } });
      if (!product) throw new Error("The selected alternative is no longer available.");
      const cost = new Decimal(product.costPrice?.toString() ?? product.suppliers[0]?.costPrice.toString() ?? "");
      if (!cost.isFinite() || cost.lte(0)) throw new Error("The alternative product has no verified cost price.");
      item = { productId: product.id, name: product.name, sku: product.sku, cost, supplierId: product.suppliers[0]?.supplierId ?? null, supplierSku: product.suppliers[0]?.supplierSku ?? null, stock: null, snapshot: { slug: product.slug } };
    }
    const price = priceFromCost(item.cost, quote.markupPercent, true);
    await tx.quotationItem.create({ data: { quotationId, productId: item.productId, productName: item.name, sku: item.sku, quantity, costPrice: item.cost, unitPrice: price.grossUnit, vatRate: new Decimal("0.15"), vatTotal: price.vatUnit.mul(quantity), lineTotal: price.grossUnit.mul(quantity), notes: "Administrator-added alternative", sourceType: source, sourceId, supplierId: item.supplierId, supplierSku: item.supplierSku, stockSnapshot: item.stock, sourceSnapshot: item.snapshot } });
    const items = await tx.quotationItem.findMany({ where: { quotationId } });
    const gross = items.reduce((sum, line) => sum.plus(line.lineTotal), new Decimal(0));
    const vat = items.reduce((sum, line) => sum.plus(line.vatTotal), new Decimal(0));
    await tx.quotation.update({ where: { id: quotationId }, data: { subtotal: gross.minus(vat), vatTotal: vat, grandTotal: gross.plus(quote.deliveryTotal).minus(quote.discountTotal), status: "UNDER_REVIEW" } });
    await tx.auditLog.create({ data: { actorId: ctx.user.id, action: "quotation.item.add-alternative", entityType: "Quotation", entityId: quotationId, after: { catalogueReference, quantity, supplierId: item.supplierId } } });
  });
  revalidatePath(`/admin/quotations/${quotationId}`);
}

export async function removeQuotationItem(formData: FormData) {
  const ctx = await requirePermission("quotations.manage");
  const { quotationId, itemId } = z.object({ quotationId: z.string().uuid(), itemId: z.string().uuid() }).parse(Object.fromEntries(formData));
  await prisma.$transaction(async tx => {
    const quote = await tx.quotation.findUniqueOrThrow({ where: { id: quotationId } });
    if (quote.kind !== "PROVISIONAL") throw new Error("Final quotation items cannot be changed.");
    if (await tx.quotationItem.count({ where: { quotationId } }) <= 1) throw new Error("A quotation must retain at least one item.");
    await tx.quotationItem.delete({ where: { id: itemId } });
    const items = await tx.quotationItem.findMany({ where: { quotationId } });
    const gross = items.reduce((sum, item) => sum.plus(item.lineTotal), new Decimal(0));
    const vat = items.reduce((sum, item) => sum.plus(item.vatTotal), new Decimal(0));
    await tx.quotation.update({ where: { id: quotationId }, data: { subtotal: gross.minus(vat), vatTotal: vat, grandTotal: gross.plus(quote.deliveryTotal).minus(quote.discountTotal), status: "UNDER_REVIEW" } });
    await tx.auditLog.create({ data: { actorId: ctx.user.id, action: "quotation.item.remove", entityType: "Quotation", entityId: quotationId, after: { itemId } } });
  });
  revalidatePath(`/admin/quotations/${quotationId}`);
}
