import { createHash } from "node:crypto";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { getCommerceSettings } from "./settings";
import { innozanziPrice } from "./engine";
import type { CommerceSettings } from "./config";

export async function pricingImpact(next: CommerceSettings) {
  const before = await getCommerceSettings();
  const [suppliers, locals] = await Promise.all([
    prisma.supplierCatalogueProduct.findMany({ where: { active: true }, orderBy:{id:"asc"},select: { id: true, costPrice: true, promotionalPrice: true, promotionStartsAt: true, promotionEndsAt: true } }),
    prisma.product.findMany({ where: { status: "PUBLISHED", deletedAt: null, isTestData: false },orderBy:{id:"asc"}, select: { id: true, costPrice: true, regularPrice: true, salePrice: true, saleStartsAt: true, saleEndsAt: true } }),
  ]);
  const now = new Date();
  let increasing = 0, decreasing = 0, unchanged = 0, exceptions = 0, localBelowFloor = 0, sumChange = new Decimal(0);
  const entries: unknown[] = [];
  for (const row of suppliers) {
    try {
      const promotion = row.promotionalPrice && row.costPrice && row.promotionalPrice.lt(row.costPrice) && row.promotionalPrice.gt(0)
        && (!row.promotionStartsAt || row.promotionStartsAt <= now) && (!row.promotionEndsAt || row.promotionEndsAt >= now);
      const cost = promotion ? row.promotionalPrice! : row.costPrice;
      if (!cost) throw new Error("Missing cost");
      const previous = innozanziPrice(cost, before).gross, price = innozanziPrice(cost, next).gross;
      const change = price.minus(previous);
      if (change.gt(0)) increasing++; else if (change.lt(0)) decreasing++; else unchanged++;
      sumChange = sumChange.plus(change);
      entries.push([row.id, cost.toString(), previous.toString(), price.toString()]);
    } catch { exceptions++; entries.push([row.id, "REVIEW"]); }
  }
  for (const row of locals) {
    try {
      if (!row.costPrice) throw new Error("Missing cost");
      const price = row.salePrice && (!row.saleStartsAt || row.saleStartsAt <= now) && (!row.saleEndsAt || row.saleEndsAt >= now) ? row.salePrice : row.regularPrice;
      const floor = innozanziPrice(row.costPrice, next).floor.gross;
      if (price.lt(floor)) localBelowFloor++;
      entries.push([row.id, price.toString(), floor.toString()]);
    } catch { exceptions++; entries.push([row.id, "REVIEW"]); }
  }
  const checked = increasing + decreasing + unchanged;
  return { increasing, decreasing, unchanged, exceptions, localBelowFloor, supplierProducts: suppliers.length, localProducts: locals.length,
    averageChange: checked ? sumChange.div(checked).toFixed(2) : "0.00",
    baseline: createHash("sha256").update(JSON.stringify(before)).digest("hex"),
    token: createHash("sha256").update(JSON.stringify({ before, next, entries })).digest("hex"),
  };
}
