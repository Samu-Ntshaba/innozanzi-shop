import Decimal from "decimal.js";
import type { Prisma } from "@/generated/prisma/client";
import { commerceSchema } from "./config";
import { innozanziPrice } from "./engine";

type ReviewItem = { productName: string; sourceType: string; sourceId: string | null; productId: string | null; variantId: string | null; quantity: number; unitPrice: Decimal.Value; costPrice: Decimal.Value | null; sourceSnapshot: unknown };

export function reviewSnapshot(item: ReviewItem, currentCost?: Decimal.Value | null) {
  const snapshot = item.sourceSnapshot as Record<string, unknown> | null;
  const parsed = commerceSchema.safeParse(snapshot?.pricingSettings);
  if (!snapshot?.pricingSettings || !parsed.success || !item.costPrice) return "Commercial snapshot requires review.";
  try {
    const paid = new Decimal(item.unitPrice);
    if (paid.lt(innozanziPrice(item.costPrice, parsed.data).floor.gross)) return "Order-time price does not meet its saved commercial floor.";
    if (currentCost != null && paid.lt(innozanziPrice(currentCost, parsed.data).floor.gross)) return "Current supplier cost no longer meets the saved commercial requirements.";
  } catch { return "Invalid commercial inputs require review."; }
  return null;
}

export async function reviewOrderEconomics(tx: Prisma.TransactionClient, items: ReviewItem[]) {
  const reasons: string[] = [];
  for (const item of items) {
    let currentCost: Decimal.Value | null = null;
    if (item.sourceType === "SUPPLIER") {
      const source = item.sourceId ? await tx.supplierCatalogueProduct.findUnique({ where: { id: item.sourceId }, include: { feed: true, supplier: true } }) : null;
      const snapshot = item.sourceSnapshot as Record<string, unknown> | null;
      const settings = commerceSchema.safeParse(snapshot?.pricingSettings);
      const since = Date.now() - (settings.success ? settings.data.freshnessHours : 30) * 3600000;
      if (!source || !source.active || source.stock < item.quantity || source.availability !== "IN_STOCK" || !source.costPrice
        || !source.feed.enabled || !source.supplier.purchasingEnabled || source.supplier.approvalStatus !== "APPROVED"
        || source.lastSeenAt.getTime() < since || !source.feed.lastSuccessAt || source.feed.lastSuccessAt.getTime() < since) {
        reasons.push(`${item.productName}: supplier availability or fresh cost requires review.`);
        continue;
      }
      const now = new Date();
      currentCost = source.promotionalPrice && source.promotionalPrice.gt(0) && source.promotionalPrice.lt(source.costPrice)
        && (!source.promotionStartsAt || source.promotionStartsAt <= now) && (!source.promotionEndsAt || source.promotionEndsAt >= now)
        ? source.promotionalPrice : source.costPrice;
    }
    const reason = reviewSnapshot(item, currentCost);
    if (reason) reasons.push(`${item.productName}: ${reason}`);
  }
  if (!items.length) reasons.push("Order has no product lines.");
  return reasons;
}
