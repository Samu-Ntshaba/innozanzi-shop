import { prisma } from "@/lib/prisma";
import { offerSlug, supplierIdentity } from "@/integrations/suppliers/identity";
import { reconcileOfferDisplay } from "@/integrations/suppliers/matching";
import type { SyncMode, SupplierFeedAdapter } from "@/integrations/syntech/feed";
import { pinnacleCategory } from "./categories";
import { parsePinnacleFeed, pinnacleBarcode, pinnacleDate, pinnacleFeatures, pinnacleNumber, type PinnacleFeedProduct } from "./parser";

export const PINNACLE_ID = "86000000-0000-4000-8000-000000000002";

export class PinnacleXmlAdapter implements SupplierFeedAdapter {
  provider = "PINNACLE";
  async fetch(mode: SyncMode) {
    void mode;
    const url = process.env.PINNACLE_XML_FEED_URL;
    if (!url) throw new Error("PINNACLE_XML_FEED_URL is not configured");
    const headers: Record<string, string> = { "user-agent": "Innozanzi-Supplier-Sync/2.0" };
    if (process.env.PINNACLE_FEED_USERNAME && process.env.PINNACLE_FEED_PASSWORD) {
      headers.authorization = `Basic ${Buffer.from(`${process.env.PINNACLE_FEED_USERNAME}:${process.env.PINNACLE_FEED_PASSWORD}`).toString("base64")}`;
    }
    const response = await fetch(url, { cache: "no-store", headers, signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`Pinnacle feed returned HTTP ${response.status}`);
    return response.text();
  }
}

export async function ensurePinnacleFeed() {
  const supplier = await prisma.supplier.upsert({
    where: { id: PINNACLE_ID },
    update: { approvalStatus: "APPROVED", isActive: true },
    create: { id: PINNACLE_ID, companyName: "Pinnacle ICT", approvalStatus: "APPROVED", purchasingEnabled: false, accountNumber: "INN038", paymentTerms: "COD", website: "https://www.pinnacle.co.za", isActive: true },
  });
  return prisma.supplierFeed.upsert({
    where: { supplierId_provider: { supplierId: supplier.id, provider: "PINNACLE" } },
    update: { adapter: "PINNACLE_XML", fullFeedUrl: "ENV:PINNACLE_XML_FEED_URL", scheduleMinutes: 1440 },
    create: { supplierId: supplier.id, provider: "PINNACLE", adapter: "PINNACLE_XML", fullFeedUrl: "ENV:PINNACLE_XML_FEED_URL", scheduleMinutes: 1440, enabled: false },
    include: { supplier: true },
  });
}

function catalogueData(row: PinnacleFeedProduct, feedId: string, supplierId: string, now: Date) {
  const sku = row.StockCode;
  const brand = row.Brand || null;
  const barcode = pinnacleBarcode(row);
  const stock = Math.max(0, Math.floor(pinnacleNumber(row.ProdQty) ?? 0));
  const features = pinnacleFeatures(row);
  const category = pinnacleCategory(row.category_tree, row.TopCat);
  const description = Object.entries(features).map(([key, value]) => `${key}: ${value}`).join(" · ") || null;
  return {
    raw: JSON.parse(JSON.stringify(row)),
    identityKey: supplierIdentity({ supplierId, sku, brand, mpn: sku, barcode }),
    feedId,
    supplierId,
    supplierProductId: sku,
    supplierSku: sku,
    manufacturerSku: sku,
    name: row.ProdName,
    slug: offerSlug(row.ProdName, supplierId, sku),
    brand,
    category: category.category,
    categoryPath: category.categoryPath,
    description,
    shortDescription: description,
    specifications: features,
    images: row.ProdImg ? [row.ProdImg] : [],
    supplierUrl: row.ProdExternalURL || null,
    stock,
    stockByLocation: { national: stock },
    availability: stock > 0 ? "IN_STOCK" : "CHECK_AVAILABILITY",
    costPrice: pinnacleNumber(row.ProdPriceExclVAT),
    recommendedRetail: null,
    promotionalPrice: null,
    promotionStartsAt: null,
    promotionEndsAt: null,
    currency: "ZAR",
    weightGrams: null,
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    warranty: null,
    barcode,
    nextShipmentAt: null,
    sourceUpdatedAt: pinnacleDate(row.LastUpdated),
    lastSeenAt: now,
    active: true,
  };
}

export async function syncPinnacleFeed(_mode: SyncMode, actorId?: string) {
  const feed = await ensurePinnacleFeed();
  if (!feed.enabled) throw new Error("Supplier feed is paused");
  const run = await prisma.supplierSyncRun.create({ data: { feedId: feed.id, supplierId: feed.supplierId, mode: "FULL", status: "RUNNING", triggeredById: actorId } });
  const now = new Date();
  try {
    const parsed = parsePinnacleFeed(await new PinnacleXmlAdapter().fetch("FULL"));
    if (new Set(parsed.map(row => row.StockCode)).size !== parsed.length) throw new Error("Duplicate supplier SKU in Pinnacle feed");
    const rows = parsed.map(row => catalogueData(row, feed.id, feed.supplierId, now)).filter(row => row.costPrice !== null && row.costPrice > 0);
    const existing = await prisma.supplierCatalogueProduct.findMany({ where: { feedId: feed.id }, select: { supplierProductId: true } });
    if (!rows.length || (existing.length > 100 && rows.length < existing.length * .5)) throw new Error(`Pinnacle full feed safety check failed: received ${rows.length} usable products for ${existing.length} cached products.`);
    const existingSkus = new Set(existing.map(row => row.supplierProductId));
    for (let index = 0; index < rows.length; index += 200) {
      await prisma.$transaction(rows.slice(index, index + 200).map(data => prisma.supplierCatalogueProduct.upsert({ where: { feedId_supplierProductId: { feedId: feed.id, supplierProductId: data.supplierProductId } }, update: data, create: data })), { timeout: 120_000 });
    }
    const currentSkus = rows.map(row => row.supplierProductId);
    const removed = await prisma.supplierCatalogueProduct.count({ where: { feedId: feed.id, active: true, supplierProductId: { notIn: currentSkus } } });
    await prisma.supplierCatalogueProduct.updateMany({ where: { feedId: feed.id, supplierProductId: { notIn: currentSkus } }, data: { active: false, availability: "DISCONTINUED" } });
    const added = rows.filter(row => !existingSkus.has(row.supplierProductId)).length;
    const updated = rows.length - added;
    const skipped = parsed.length - rows.length;
    const finishedAt = new Date();
    await prisma.supplierSyncRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", finishedAt, recordsReceived: parsed.length, recordsAdded: added, recordsUpdated: updated, recordsRemoved: removed, recordsSkipped: skipped, diagnostics: { source: "PINNACLE_XML", authoritative: true } } });
    await prisma.supplierFeed.update({ where: { id: feed.id }, data: { lastSuccessAt: finishedAt, lastError: null, lastFullSyncAt: finishedAt, lastIncrementalSyncAt: finishedAt, nextSyncAt: new Date(finishedAt.getTime() + feed.scheduleMinutes * 60_000) } });
    await reconcileOfferDisplay();
    return { runId: run.id, total: parsed.length, added, updated, removed, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.supplierSyncRun.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date(), error: message } });
    await prisma.supplierFeed.update({ where: { id: feed.id }, data: { lastError: message, nextSyncAt: new Date(Date.now() + 15 * 60_000) } });
    throw error;
  }
}
