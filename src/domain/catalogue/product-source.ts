import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { activeUnitPrice } from "@/domain/cart/calculations";
import { isDailySpecial, minimumRetailPrice, supplierRetailPrice } from "@/domain/catalogue/retail-pricing";
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
    // The customer-visible catalogue price is authoritative through cart, checkout and payment.
    // Never silently replace it with a second cost-plus calculation at checkout.
    const grossUnit = activeUnitPrice(item.product,item.variant);
    const minimum = minimumRetailPrice(cost);
    if(grossUnit.lt(minimum))throw new Error(`${item.product.name} needs a pricing review before checkout. Its displayed price is below the approved minimum.`);
    const price = {netUnit:grossUnit,vatUnit:new Decimal(0),grossUnit};
    const sku = item.variant?.sku ?? item.product.sku;
    return {
      sourceType: "LOCAL", sourceId: item.variantId ?? item.productId, productId: item.productId,
      variantId: item.variantId, supplierId: null, supplierProductId: null, supplierSku: null,
      productName: item.product.name, sku, quantity: item.quantity, costPrice: cost,
      ...price, vatRate: new Decimal(0), available,
      pricingRule: "DISPLAYED_CATALOGUE_PRICE_WITH_MINIMUM_PROFIT_GUARD",
      sourceSnapshot: { sourceType: "LOCAL", productId: item.productId, variantId: item.variantId, name: item.product.name, sku, image: item.product.images[0]?.path ?? null, available, costPrice: cost.toString(), customerUnitPrice:grossUnit.toString(), minimumRetailPrice:minimum.toString(), markupPercent: markup.toString(), vatStatus: item.product.vatStatus, capturedAt: new Date().toISOString() },
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
    const retail=supplierRetailPrice({costPrice:cost,recommendedRetail:product.recommendedRetail,promotionalPrice:product.promotionalPrice,promotionStartsAt:product.promotionStartsAt,promotionEndsAt:product.promotionEndsAt,special:isDailySpecial(product.id)});
    const grossUnit=retail.salePrice??retail.regularPrice;
    const price={netUnit:grossUnit,vatUnit:new Decimal(0),grossUnit};
    return {
      sourceType: "SUPPLIER", sourceId: product.id, productId: null, variantId: null,
      supplierId: product.supplierId, supplierProductId: product.supplierProductId, supplierSku: product.supplierSku,
      productName: product.name, sku: product.manufacturerSku ?? product.supplierSku, quantity: item.quantity,
      costPrice: cost, ...price, vatRate: new Decimal(0), available: product.stock,
      pricingRule: retail.salePrice?"DISPLAYED_SUPPLIER_SALE_PRICE":"DISPLAYED_SUPPLIER_RETAIL_PRICE",
      sourceSnapshot: { sourceType: "SUPPLIER", cacheProductId: product.id, supplierId: product.supplierId, supplier: product.supplier.companyName, supplierProductId: product.supplierProductId, supplierSku: product.supplierSku, manufacturerSku: product.manufacturerSku, name: product.name, description: product.description, specifications: product.specifications, images: product.images, availability: product.availability, stock: product.stock, costPrice: cost.toString(),recommendedRetail:product.recommendedRetail?.toString()??null,promotionalCost:product.promotionalPrice?.toString()??null,customerUnitPrice:grossUnit.toString(),regularRetailPrice:retail.regularPrice.toString(),saleRetailPrice:retail.salePrice?.toString()??null, currency: product.currency, markupPercent: markup.toString(), sourceUpdatedAt: product.sourceUpdatedAt?.toISOString() ?? null, capturedAt: new Date().toISOString() },
    };
  });
  return [...local, ...supplier];
}
