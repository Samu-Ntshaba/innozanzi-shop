import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { priceFromCost } from "@/domain/quotations/lifecycle";
import type { getCurrentCart } from "@/domain/cart/service";
import type { Prisma } from "@/generated/prisma/client";

type CurrentCart = NonNullable<Awaited<ReturnType<typeof getCurrentCart>>>;

export type QuotationSourceLine = {
  sourceType: "LOCAL" | "SUPPLIER";
  sourceId: string;
  productId: string | null;
  variantId: string | null;
  supplierId: string | null;
  supplierProductId: string | null;
  supplierSku: string | null;
  productName: string;
  sku: string | null;
  quantity: number;
  costPrice: Decimal;
  netUnit: Decimal;
  vatUnit: Decimal;
  grossUnit: Decimal;
  vatRate: Decimal;
  available: number;
  pricingRule: string;
  sourceSnapshot: Prisma.InputJsonObject;
};

const positiveCost = (value: Decimal.Value | null | undefined, productName: string) => {
  const cost = new Decimal(value?.toString() ?? "0");
  if (!cost.isFinite() || cost.lte(0)) throw new Error(`${productName} has no verified cost price and cannot be priced automatically.`);
  return cost;
};

export async function resolveQuotationCart(cart: CurrentCart, markup: Decimal): Promise<QuotationSourceLine[]> {
  const local = cart.items.map((item): QuotationSourceLine => {
    const inventory = item.variant?.inventory ?? item.product.inventory[0];
    const available = inventory ? inventory.onHand - inventory.reserved : 0;
    if (item.product.status !== "PUBLISHED" || item.product.deletedAt) throw new Error(`${item.product.name} is no longer available.`);
    if (item.quantity > available) throw new Error(`${item.product.name} only has ${available} units available.`);
    const cost = positiveCost(item.variant?.costPrice ?? item.product.costPrice ?? item.product.suppliers[0]?.costPrice, item.product.name);
    // Product tax classification is retained in the snapshot, but Innozanzi is not
    // currently VAT registered and therefore must not add output VAT to quotations.
    const taxable = false;
    const price = priceFromCost(cost, markup, taxable);
    const sku = item.variant?.sku ?? item.product.sku;
    return {
      sourceType: "LOCAL", sourceId: item.variantId ?? item.productId, productId: item.productId,
      variantId: item.variantId, supplierId: null, supplierProductId: null, supplierSku: null,
      productName: item.product.name, sku, quantity: item.quantity, costPrice: cost,
      ...price, vatRate: taxable ? new Decimal("0.15") : new Decimal(0), available,
      pricingRule: "VERIFIED_COST_PLUS_CONFIGURED_MARKUP",
      sourceSnapshot: { sourceType: "LOCAL", productId: item.productId, variantId: item.variantId, name: item.product.name, sku, image: item.product.images[0]?.path ?? null, available, costPrice: cost.toString(), markupPercent: markup.toString(), vatStatus: item.product.vatStatus, capturedAt: new Date().toISOString() },
    };
  });

  if (!cart.supplierItems.length) return local;
  const products = await prisma.supplierCatalogueProduct.findMany({
    where: { active: true, OR: cart.supplierItems.map((item) => ({ supplierId: item.supplierId, supplierProductId: item.supplierProductId })) },
    include: { supplier: { select: { companyName: true } } },
  });
  if (products.length !== cart.supplierItems.length) throw new Error("A supplier product is no longer available. Review your quotation list.");
  const supplier = cart.supplierItems.map((item): QuotationSourceLine => {
    const product = products.find((row) => row.supplierId === item.supplierId && row.supplierProductId === item.supplierProductId);
    if (!product) throw new Error(`Supplier item ${item.supplierSku} is no longer available.`);
    if (item.quantity > product.stock) throw new Error(`${product.name} only has ${product.stock} supplier units currently available.`);
    const cost = positiveCost(product.costPrice, product.name);
    // Innozanzi is currently not VAT registered. Supplier feed prices are treated as landed cost
    // and no output VAT is added until a formal tax configuration is enabled.
    const price = priceFromCost(cost, markup, false);
    return {
      sourceType: "SUPPLIER", sourceId: product.id, productId: null, variantId: null,
      supplierId: product.supplierId, supplierProductId: product.supplierProductId, supplierSku: product.supplierSku,
      productName: product.name, sku: product.manufacturerSku ?? product.supplierSku, quantity: item.quantity,
      costPrice: cost, ...price, vatRate: new Decimal(0), available: product.stock,
      pricingRule: "SUPPLIER_COST_PLUS_CONFIGURED_MARKUP_NO_OUTPUT_VAT",
      sourceSnapshot: { sourceType: "SUPPLIER", cacheProductId: product.id, supplierId: product.supplierId, supplier: product.supplier.companyName, supplierProductId: product.supplierProductId, supplierSku: product.supplierSku, manufacturerSku: product.manufacturerSku, name: product.name, description: product.description, specifications: product.specifications, images: product.images, availability: product.availability, stock: product.stock, costPrice: cost.toString(), currency: product.currency, markupPercent: markup.toString(), sourceUpdatedAt: product.sourceUpdatedAt?.toISOString() ?? null, capturedAt: new Date().toISOString() },
    };
  });
  return [...local, ...supplier];
}
