import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const getPrisma = async () => (await import("@/lib/prisma")).prisma;

export const socialRequestSchema = z.object({
  stream: z.enum(["EVERGREEN", "CAMPAIGN"]),
  channel: z.enum(["LINKEDIN", "FACEBOOK", "INSTAGRAM"]).default("LINKEDIN"),
  slot: z.string().trim().min(4).max(100).regex(/^[A-Za-z0-9:_-]+$/),
  format: z.enum(["SINGLE", "CAROUSEL"]).default("SINGLE"),
});

export const socialResultSchema = z.object({
  deliveryId: z.string().uuid(),
  status: z.enum(["APPROVED", "PUBLISHED", "REJECTED", "FAILED"]),
  caption: z.string().trim().max(5_000).optional(),
  externalId: z.string().trim().max(300).optional(),
  externalUrl: z.string().url().max(1_000).optional(),
  error: z.string().trim().max(2_000).optional(),
});

export function authorisedSocialAutomation(request: Request) {
  const expected = process.env.N8N_SOCIAL_WEBHOOK_SECRET ?? process.env.N8N_LINKEDIN_WEBHOOK_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

const clean = (value: string | null) => (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const fingerprint = (parts: string[]) => createHash("sha256").update(parts.sort().join("|")).digest("hex");
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.innozanzi.co.za").replace(/\/$/, "");

const featureLibrary: Record<string, { title: string; summary: string; url: string }> = {
  AI_SHOPPING_ASSISTANT: { title: "Ask Innozanzi AI", summary: "Tell Innozanzi AI your budget and what you need to receive a short recommendation from currently available products, or a compatibility-checked PC build.", url: "/shop" },
  PC_BUILDER: { title: "Plan a purpose-built PC", summary: "Help customers choose compatible components around the work, gaming or performance outcome they need.", url: "/pc-builder" },
  GAMING: { title: "Gaming technology", summary: "Explore practical gaming setups, upgrades and accessories without inventing performance claims.", url: "/shop?category=gaming" },
  BUSINESS_PROCUREMENT: { title: "Business technology procurement", summary: "Explain how structured requirements, availability checks and quotations simplify purchasing.", url: "/business" },
  SUPPORT: { title: "Technology support", summary: "Share practical guidance about choosing, deploying and supporting workplace technology.", url: "/contact" },
  INSIGHTS: { title: "Practical technology insight", summary: "Teach a useful, factual lesson for South African organisations buying or managing technology.", url: "/blog" },
};

type SocialInput = z.infer<typeof socialRequestSchema>;
type SocialMaterial = { contentType: string; sourceType: string; sourceIds: string[]; assets: Array<Record<string, unknown>> };

async function existingDelivery(input: SocialInput) {
  const prisma = await getPrisma();
  return prisma.socialDelivery.findUnique({ where: { stream_channel_slotKey: { stream: input.stream, channel: input.channel, slotKey: input.slot } } });
}

async function recentSourceIds(days = 90) {
  const prisma = await getPrisma();
  const rows = await prisma.socialDelivery.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: new Date(Date.now() - days * 86_400_000) } },
    select: { sourceIds: true },
  });
  return [...new Set(rows.flatMap(row => row.sourceIds))];
}

async function activeCampaign(channel: string) {
  const prisma = await getPrisma();
  const now = new Date();
  return prisma.socialCampaign.findFirst({
    where: { status: "ACTIVE", startsAt: { lte: now }, endsAt: { gte: now }, channels: { has: channel } },
    orderBy: [{ priority: "desc" }, { startsAt: "asc" }],
  });
}

async function productPayload(input: SocialInput, productIds?: string[]): Promise<SocialMaterial | null> {
  const prisma = await getPrisma();
  const excluded = await recentSourceIds();
  const now = new Date();
  const take = input.format === "CAROUSEL" ? 5 : 1;
  const baseWhere = {
    active: true,
    availability: "IN_STOCK",
    stock: { gt: 0 },
    images: { isEmpty: false },
    ...(productIds?.length ? { id: { in: productIds, ...(excluded.length ? { notIn: excluded } : {}) } } : excluded.length ? { id: { notIn: excluded } } : {}),
  };
  let products = await prisma.supplierCatalogueProduct.findMany({
    where: baseWhere,
    orderBy: [{ promotionalPrice: "asc" }, { sourceUpdatedAt: "desc" }, { stock: "desc" }],
    take,
    select: { id: true, name: true, slug: true, brand: true, category: true, shortDescription: true, images: true, warranty: true, manufacturerSku: true, promotionalPrice: true, promotionStartsAt: true, promotionEndsAt: true },
  });
  if (!products.length && excluded.length) {
    products = await prisma.supplierCatalogueProduct.findMany({ where: { ...baseWhere, id: productIds?.length ? { in: productIds } : undefined }, orderBy: { sourceUpdatedAt: "desc" }, take, select: { id: true, name: true, slug: true, brand: true, category: true, shortDescription: true, images: true, warranty: true, manufacturerSku: true, promotionalPrice: true, promotionStartsAt: true, promotionEndsAt: true } });
  }
  if (!products.length) return null;
  const items = products.map(product => {
    const promotionActive = Boolean(product.promotionalPrice && (!product.promotionStartsAt || product.promotionStartsAt <= now) && (!product.promotionEndsAt || product.promotionEndsAt >= now));
    return { id: product.id, name: product.name, brand: product.brand, category: product.category, description: clean(product.shortDescription).slice(0, 500), warranty: product.warranty, manufacturerSku: product.manufacturerSku, images: product.images.slice(0, 5), url: `${siteUrl()}/supplier-products/${product.slug}`, promotionActive };
  });
  return { contentType: items.some(item => item.promotionActive) ? "PROMOTION" : input.format === "CAROUSEL" ? "PRODUCT_CAROUSEL" : "PRODUCT_SPOTLIGHT", sourceType: "PRODUCT", sourceIds: items.map(item => item.id), assets: items };
}

export async function reserveSocialContent(input: SocialInput) {
  const prisma = await getPrisma();
  const existing = await existingDelivery(input);
  if (existing) return existing;
  const campaign = input.stream === "CAMPAIGN" ? await activeCampaign(input.channel) : null;
  if (input.stream === "CAMPAIGN" && !campaign) return null;

  let material: SocialMaterial | null = await productPayload(input, campaign?.targetProductIds.length ? campaign.targetProductIds : undefined);
  if (campaign?.focusType === "FEATURE" && campaign.targetFeatureKeys.length) {
    const assets = campaign.targetFeatureKeys.map(key => ({ key, ...featureLibrary[key] })).filter(item => item.title).map(item => ({ ...item, url: `${siteUrl()}${item.url}`, images: [`${siteUrl()}/social/innozanzi-share.png`] }));
    if (assets.length) material = { contentType: "FEATURE_FOCUS", sourceType: "FEATURE", sourceIds: campaign.targetFeatureKeys, assets };
  }
  if (!material) return null;
  const fp = fingerprint([input.stream, input.channel, material.contentType, ...material.sourceIds]);
  const duplicate = await prisma.socialDelivery.findFirst({ where: { fingerprint: fp, status: "PUBLISHED", publishedAt: { gte: new Date(Date.now() - 90 * 86_400_000) } } });
  if (duplicate) return null;
  const payload = {
    deliveryId: "assigned-after-reservation",
    stream: input.stream,
    channel: input.channel,
    slot: input.slot,
    format: input.format,
    contentType: material.contentType,
    objective: campaign?.objective ?? (material.contentType === "PROMOTION" ? "Promote a verified current offer" : "Build useful product awareness"),
    audience: campaign?.audience ?? "South African businesses and technology buyers",
    instructions: campaign?.instructions ?? "Write factual, useful copy. Never invent price, discount, stock quantity, delivery timing, specifications, partnerships or performance claims.",
    campaign: campaign ? { id: campaign.id, name: campaign.name, endsAt: campaign.endsAt } : null,
    assets: material.assets,
    caption: (() => {
      const first = material.assets[0] ?? {};
      const title = String(first.name ?? first.title ?? "Practical business technology");
      const detail = String(first.description ?? first.summary ?? "A useful technology option for South African organisations.");
      const url = String(first.url ?? siteUrl());
      return [title, detail, campaign?.instructions, "Talk to Innozanzi about requirements, availability and a tailored quotation.", url, "#BusinessTechnology #SouthAfrica #Innozanzi"].filter(Boolean).join("\n\n");
    })(),
    approvalRequired: true,
  };
  try {
    const delivery = await prisma.socialDelivery.create({ data: { campaignId: campaign?.id, stream: input.stream, channel: input.channel, slotKey: input.slot, contentType: material.contentType, sourceType: material.sourceType, sourceIds: material.sourceIds, fingerprint: fp, payload: JSON.parse(JSON.stringify(payload)), reservedUntil: new Date(Date.now() + 24 * 60 * 60_000) } });
    return { ...delivery, payload: { ...payload, deliveryId: delivery.id } };
  } catch {
    return existingDelivery(input);
  }
}

export async function recordSocialResult(input: z.infer<typeof socialResultSchema>) {
  const prisma = await getPrisma();
  const current = await prisma.socialDelivery.findUnique({ where: { id: input.deliveryId } });
  if (!current) return null;
  if (current.status === "PUBLISHED" && input.status === "PUBLISHED") return current;
  return prisma.socialDelivery.update({
    where: { id: input.deliveryId },
    data: { status: input.status, caption: input.caption, externalId: input.externalId, externalUrl: input.externalUrl, error: input.error, publishedAt: input.status === "PUBLISHED" ? new Date() : current.publishedAt },
  });
}

export const socialFeatures = featureLibrary;
