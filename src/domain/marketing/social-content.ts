import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { z } from "zod";
import { brand } from "@/config/brand";
import { marketingBusinessRules } from "@/config/business-facts";
import { enqueueEmail } from "@/integrations/email/outbox";
import { mailDeliveryMode } from "@/integrations/email/provider";
import { sellableSupplierWhere } from "@/integrations/suppliers/availability";
import { getOpenAIClient } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase";

// Legacy types remain filterable even though daily automation now creates one post.
export const DAILY_SOCIAL_TYPES = ["PRODUCT", "PC_BUILDER", "GAMING"] as const;
export type DailySocialType = (typeof DAILY_SOCIAL_TYPES)[number];

const dailyCopySchema = z.object({
  title: z.string().trim().min(5).max(70),
  caption: z.string().trim().min(40).max(650),
  imageAlt: z.string().trim().min(10).max(220),
  hashtags: z.array(z.string().trim().min(2).max(40)).min(2).max(4),
});

type Source = { type: DailySocialType; sourceType: string; sourceId: string; name: string; detail: string; image?: string; images?: string[]; url: string };
const CONTENT_PLANS = [
  { angle: "practical product discovery", tone: "clear, confident and useful", emoji: false },
  { angle: "one helpful buying consideration", tone: "expert but easy to understand", emoji: false },
  { angle: "how this could improve work or study", tone: "aspirational without exaggeration", emoji: false },
  { angle: "a satisfying setup improvement", tone: "visual, energetic and concise", emoji: true },
  { angle: "a real small-business technology need", tone: "professional and outcome-focused", emoji: false },
  { angle: "an everyday benefit people can immediately recognise", tone: "warm and conversational", emoji: true },
  { angle: "a fun weekend technology find", tone: "playful, tasteful and never gimmicky", emoji: true },
] as const;
const VISUAL_STYLES = [
  { centre: "#ffffff", edge: "#eef3f7", mark: false },
  { centre: "#ffffff", edge: "#eef3f7", mark: false },
  { centre: "#ffffff", edge: "#e8f6fb", mark: false },
  { centre: "#fafdff", edge: "#dceff7", mark: true },
  { centre: "#fffdf8", edge: "#e9eef4", mark: false },
  { centre: "#ffffff", edge: "#e0e7ff", mark: false },
  { centre: "#f7fcff", edge: "#d7f0fa", mark: true },
] as const;
const clean = (value?: string | null) => (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const baseUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, "");
export const socialContentDay = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
export const socialContentDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const fingerprint = (parts: string[]) => createHash("sha256").update(parts.join("|")).digest("hex");
const seedNumber = (seed: string) => Number.parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16);
const planForDay = (day: string) => CONTENT_PLANS[seedNumber(day) % CONTENT_PLANS.length];
const visualForDay = (day: string) => VISUAL_STYLES[seedNumber(`visual:${day}`) % VISUAL_STYLES.length];
type GenerationStage = "CATALOGUE" | "COPY" | "PRODUCT_ARTWORK" | "STORAGE" | "EMAIL";
const stageError = (stage: GenerationStage, error: unknown) => new Error(`SOCIAL_${stage}: ${error instanceof Error ? error.message : "Unknown failure"}`);
async function atStage<T>(stage: GenerationStage, work: () => Promise<T>) { try { return await work(); } catch (error) { throw stageError(stage, error); } }
const retryable = (error: unknown) => { const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 0, message = error instanceof Error ? error.message : ""; return status === 429 || status >= 500 || /timeout|timed out|fetch failed|ECONNRESET|temporar/i.test(message); };
async function withTransientRetry<T>(work: () => Promise<T>) { try { return await work(); } catch (error) { if (!retryable(error)) throw error; return work(); } }

export async function socialGenerationReadiness() { const settings = await socialSettings(); return { recipient: Boolean(settings.recipientEmail), openai: Boolean(process.env.OPENAI_API_KEY), storage: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY), email: mailDeliveryMode() !== "unconfigured" }; }
export function authorisedMarketingCron(request: Request) { const expected = process.env.CRON_SECRET, supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""; if (!expected || !supplied) return false; const a = Buffer.from(expected), b = Buffer.from(supplied); return a.length === b.length && timingSafeEqual(a, b); }

export async function socialSettings() {
  const rows = await prisma.marketingSetting.findMany({ where: { key: { in: ["social.recipientEmail", "social.enabled", "social.generationHour", "social.brandDirection"] } } });
  const values = new Map(rows.map(row => [row.key, row.value]));
  return {
    recipientEmail: typeof values.get("social.recipientEmail") === "string" ? values.get("social.recipientEmail") as string : "",
    enabled: typeof values.get("social.enabled") === "boolean" ? values.get("social.enabled") as boolean : true,
    generationHour: typeof values.get("social.generationHour") === "number" ? values.get("social.generationHour") as number : 7,
    brandDirection: typeof values.get("social.brandDirection") === "string" ? values.get("social.brandDirection") as string : "Clean, confident and human. Real products, accurate colour and no text embedded in images.",
  };
}

async function chooseDailySource(seed: string): Promise<Source> {
  const recent = await prisma.socialContent.findMany({ where: { sourceType: "SUPPLIER_PRODUCT", sourceId: { not: null }, createdAt: { gte: new Date(Date.now() - 90 * 86_400_000) } }, select: { sourceId: true } });
  const excluded = recent.flatMap(row => row.sourceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.sourceId) ? [row.sourceId] : []);
  const sellable = await sellableSupplierWhere();
  const showcaseWhere = {
    active: true, availability: "IN_STOCK" as const, stock: { gt: 0 }, images: { isEmpty: false }, costPrice: { gt: 2_000 },
    id: excluded.length ? { notIn: excluded } : undefined, ...sellable,
    AND: [
      { OR: [{ category: "Computers" }, { categoryPath: { contains: "Laptop", mode: "insensitive" as const } }, { categoryPath: { contains: "Monitor", mode: "insensitive" as const } }, { categoryPath: { contains: "Gaming", mode: "insensitive" as const } }, { categoryPath: { contains: "Networking", mode: "insensitive" as const } }, { categoryPath: { contains: "Printer", mode: "insensitive" as const } }, { categoryPath: { contains: "Power", mode: "insensitive" as const } }, { name: { contains: "workstation", mode: "insensitive" as const } }] },
      { NOT: { categoryPath: { contains: "Unboxed", mode: "insensitive" as const } } },
      { NOT: { categoryPath: { contains: "Last Chance", mode: "insensitive" as const } } },
    ],
  };
  let candidates = await prisma.supplierCatalogueProduct.findMany({ where: showcaseWhere, orderBy: [{ costPrice: "desc" }, { stock: "desc" }], take: 120 });
  if (!candidates.length) candidates = await prisma.supplierCatalogueProduct.findMany({ where: { active: true, availability: "IN_STOCK", stock: { gt: 0 }, images: { isEmpty: false }, costPrice: { gt: 2_000 }, ...sellable }, orderBy: [{ costPrice: "desc" }, { stock: "desc" }], take: 120 });
  const product = candidates.length ? candidates[Number.parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16) % candidates.length] : null;
  if (!product) throw new Error("At least one active supplier product with images is required.");
  const detail = [product.brand, product.category, clean(product.shortDescription ?? product.description)].filter(Boolean).join(" · ").slice(0, 700);
  return { type: "PRODUCT", sourceType: "SUPPLIER_PRODUCT", sourceId: product.id, name: product.name, detail, image: product.images[0], images: product.images, url: `${baseUrl()}/supplier-products/${product.slug}` };
}

async function createDailyCopy(source: Source, day: string, direction: string) {
  const plan = planForDay(day);
  const response = await withTransientRetry(() => getOpenAIClient().responses.create({
    model: process.env.OPENAI_SOCIAL_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.6", store: false,
    input: `Write one ready-to-post social caption for Innozanzi Shop using only the supplied product facts.\n\n${marketingBusinessRules}\n\nProduct: ${JSON.stringify(source)}\nContent angle: ${plan.angle}.\nTone for today: ${plan.tone}.\nBrand direction: ${direction}.\n\nTarget customers are in South Africa. Open with a strong, natural hook that suits today's angle, then explain one concrete customer benefit or useful buying consideration. Keep it human and specific—not AI copy, clickbait or a corporate brochure. Vary sentence rhythm and wording from a standard product advert. ${plan.emoji ? "You may use one relevant emoji if it genuinely improves the post." : "Do not use emojis."} Never invent specifications, price, stock level, discounts, delivery information, performance claims or customer claims. Do not mention delivery. Do not put hashtags inside the caption; return 2–4 focused hashtags separately, including a relevant South African technology or audience tag. Return JSON only.`,
    text: { format: { type: "json_schema", name: "daily_social_post", strict: true, schema: { type: "object", additionalProperties: false, properties: { title: { type: "string", minLength: 5, maxLength: 70 }, caption: { type: "string", minLength: 40, maxLength: 650 }, imageAlt: { type: "string", minLength: 10, maxLength: 220 }, hashtags: { type: "array", minItems: 2, maxItems: 4, items: { type: "string", minLength: 2, maxLength: 40 } } }, required: ["title", "caption", "imageAlt", "hashtags"] } } },
  }, { timeout: 60_000 }));
  const post = dailyCopySchema.parse(JSON.parse(response.output_text));
  const body = post.caption.replace(/#[A-Za-z0-9]+/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 500).trim();
  const suggested = post.hashtags.map(value => `#${value.replace(/^#/, "").replace(/[^A-Za-z0-9]/g, "")}`).filter(value => value.length > 2).slice(0, 2);
  const hashtags = [...new Set([...suggested, "#TechSouthAfrica", "#Innozanzi"])].slice(0, 4);
  return { ...post, caption: `${body}\n\nExplore it: ${source.url}\n\n${hashtags.join(" ")}` };
}

async function bestProductImage(source: Source) {
  const candidates = [...new Set([...(source.images ?? []), ...(source.image ? [source.image] : [])])].slice(0, 8);
  const images = await Promise.all(candidates.map(async url => { try { const response = await fetch(url); if (!response.ok) return null; const bytes = Buffer.from(await response.arrayBuffer()); const metadata = await sharp(bytes).metadata(); return { bytes, pixels: (metadata.width ?? 0) * (metadata.height ?? 0) }; } catch { return null; } }));
  const best = images.filter((item): item is NonNullable<typeof item> => Boolean(item)).sort((a, b) => b.pixels - a.pixels)[0];
  if (!best) throw new Error("Could not download a usable product image.");
  return best.bytes;
}

// Image-only artwork: no generated typography, logo, banner, line or promotional claim.
async function cleanProductArtwork(source: Source, seed = "neutral") {
  const product = await bestProductImage(source);
  return cleanImageArtwork(product, seed);
}

async function cleanImageArtwork(product: Buffer, seed = "neutral") {
  const style = visualForDay(seed);
  const background = Buffer.from(`<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="b" cx="50%" cy="44%" r="68%"><stop offset="0" stop-color="${style.centre}"/><stop offset="1" stop-color="${style.edge}"/></radialGradient></defs><rect width="1080" height="1350" fill="url(#b)"/></svg>`);
  const prepared = await sharp(product).rotate().trim({ background: { r: 255, g: 255, b: 255, alpha: 0 } }).resize(900, 1120, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" }).sharpen({ sigma: 0.7 }).png().toBuffer();
  const layers: OverlayOptions[] = [{ input: prepared, gravity: "centre" }];
  if (style.mark) layers.push({ input: await sharp(await readFile(path.join(process.cwd(), "public/brand/innozanzi-shop-mark.png"))).resize(74, 74).png().toBuffer(), left: 958, top: 1228 });
  return sharp(background).composite(layers).webp({ quality: 96, smartSubsample: true }).toBuffer();
}

async function uploadArtwork(bytes: Buffer, day: string, type: string) {
  const bucket = process.env.SUPABASE_PUBLIC_BUCKET ?? "product-images", storage = createSupabaseAdmin();
  if (!(await storage.storage.getBucket(bucket)).data) { const made = await storage.storage.createBucket(bucket, { public: true, fileSizeLimit: 8 * 1024 * 1024 }); if (made.error) throw made.error; }
  const objectPath = `social/${day}/${type.toLowerCase()}-${randomUUID()}.webp`;
  const uploaded = await withTransientRetry(() => storage.storage.from(bucket).upload(objectPath, bytes, { contentType: "image/webp", upsert: false }));
  if (uploaded.error) throw uploaded.error;
  return storage.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
}

const xml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
function emailHtml(items: Array<{ title: string; caption: string; imageUrl: string; contentType: string }>, intro: string) { return `<div style="margin:auto;max-width:680px;font-family:Arial,sans-serif;color:#152536"><div style="padding:24px;border-radius:12px;background:#071b33;color:white"><img src="${baseUrl()}${brand.assets.lightLogo}" width="210" alt="Innozanzi"><h1 style="margin:22px 0 8px">Social content ready</h1><p style="margin:0;color:#d5e3ef">${intro}</p></div>${items.map(item => `<div style="margin-top:22px;padding:18px;border:1px solid #dbe3ea;border-radius:12px"><div style="font-size:12px;font-weight:bold;color:#087ea4">${item.contentType.replaceAll("_", " ")}</div><h2>${xml(item.title)}</h2><img src="${item.imageUrl}" alt="" style="width:100%;border-radius:8px"><p style="white-space:pre-wrap;line-height:1.6">${xml(item.caption)}</p><p><a href="${item.imageUrl}">Download full-size image</a></p></div>`).join("")}</div>`; }

async function emailContent(ids: string[], day: string, recipient: string, intro: string) {
  const items = await prisma.socialContent.findMany({ where: { id: { in: ids } }, orderBy: { createdAt: "desc" } });
  const attachments = await Promise.all(items.map(async item => ({ filename: `innozanzi-${item.contentType.toLowerCase()}-${day}.webp`, content: Buffer.from(await (await fetch(item.imageUrl)).arrayBuffer()), contentType: "image/webp" })));
  try {
    await enqueueEmail({ to: recipient, subject: items[0]?.contentType === "INSIGHT" ? `Innozanzi insight social post · ${items[0].title}` : `Innozanzi daily social post · ${day}`, html: emailHtml(items, intro), text: items.map(item => `${item.title}\n${item.caption}\nImage: ${item.imageUrl}`).join("\n\n---\n\n"), attachments, category: "marketing", idempotencyKey: `social-content:${items.map(item => `${item.id}:${item.fingerprint}`).join(":")}:${recipient.toLowerCase()}` });
    await prisma.socialContent.updateMany({ where: { id: { in: ids } }, data: { emailStatus: "SENT", emailedAt: new Date(), error: null } });
  } catch (error) { await prisma.socialContent.updateMany({ where: { id: { in: ids } }, data: { emailStatus: "FAILED", error: error instanceof Error ? error.message.slice(0, 2000) : "Email delivery failed" } }); throw error; }
}

async function canonicalDailyPost(day: string) {
  const existing = await prisma.socialContent.findMany({ where: { generationKey: { startsWith: `daily:${day}:` }, contentType: { in: [...DAILY_SOCIAL_TYPES] } }, orderBy: { createdAt: "desc" } });
  if (!existing.length) return null;
  const canonicalKey = `daily:${day}:PRIMARY`, keep = existing.find(item => item.generationKey === canonicalKey) ?? existing[0], remove = existing.filter(item => item.id !== keep.id).map(item => item.id);
  const migrated = keep.generationKey !== canonicalKey || remove.length > 0;
  return { item: keep, migrated, remove };
}

export async function generateDailySocialContent(options: { date?: Date; actorId?: string; force?: boolean } = {}) {
  const settings = await socialSettings();
  if (!settings.enabled) return { status: "disabled", created: 0 };
  if (!settings.recipientEmail) throw new Error("Set the social content recipient email in Marketing settings first.");
  const day = socialContentDay(options.date), canonical = await canonicalDailyPost(day), existing = canonical?.item ?? null;
  if (existing && !options.force && !canonical?.migrated) { if (existing.emailStatus !== "SENT") await atStage("EMAIL", () => emailContent([existing.id], day, settings.recipientEmail, "Today’s single ready-to-post image and caption are attached. Review them, then publish manually.")); return { status: "already-generated", created: 0, items: [existing] }; }
  const generationSeed = options.force ? `${day}:${Date.now()}` : day;
  const source = await atStage("CATALOGUE", () => chooseDailySource(generationSeed));
  const post = await atStage("COPY", () => createDailyCopy(source, generationSeed, settings.brandDirection));
  const bytes = await atStage("PRODUCT_ARTWORK", () => cleanProductArtwork(source, generationSeed));
  const imageUrl = await atStage("STORAGE", () => uploadArtwork(bytes, day, source.type));
  const data = { contentDate: socialContentDate(day), contentType: source.type, title: post.title, caption: post.caption, imageUrl, imageAlt: post.imageAlt, destinationUrl: source.url, sourceType: source.sourceType, sourceId: source.sourceId, fingerprint: fingerprint([source.type, source.sourceId, post.caption]), generationKey: `daily:${day}:PRIMARY`, emailStatus: "PENDING", emailedAt: null, error: null, createdById: options.actorId };
  const item = existing ? await prisma.$transaction(async transaction => {
    if (canonical?.remove.length) await transaction.socialContent.deleteMany({ where: { id: { in: canonical.remove } } });
    return transaction.socialContent.update({ where: { id: existing.id }, data });
  }) : await prisma.socialContent.create({ data });
  const replaced = Boolean(options.force || canonical?.migrated);
  await atStage("EMAIL", () => emailContent([item.id], day, settings.recipientEmail, replaced ? "Today’s social post was regenerated. The replacement image and caption are attached for review." : "Today’s single ready-to-post image and caption are attached. Review them, then publish manually."));
  return { status: replaced ? "regenerated" : "generated", created: existing ? 0 : 1, items: [item] };
}

export async function generateBlogSocialContent(post: { id: string; title: string; excerpt: string; coverImageUrl: string | null; slug: string }, actorId?: string | null) {
  const settings = await socialSettings(); if (!settings.recipientEmail) return null;
  const generationKey = `blog:${post.id}`, existing = await prisma.socialContent.findUnique({ where: { generationKey } }); if (existing) return existing;
  const url = `${baseUrl()}/blog/${post.slug}`;
  const response = await getOpenAIClient().responses.create({ model: process.env.OPENAI_SOCIAL_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.6", store: false, input: `Write one natural, human social caption that sells the value of this Innozanzi insight without sounding like AI. ${marketingBusinessRules} Use plain English, a clear reason to read, this URL, and no more than 3 hashtags. Title: ${post.title}\nExcerpt: ${post.excerpt}\nURL: ${url}` }, { timeout: 30_000 });
  const source: Source = { type: "PC_BUILDER", sourceType: "BLOG", sourceId: post.id, name: post.title, detail: post.excerpt, image: post.coverImageUrl ?? undefined, url }, day = socialContentDay();
  const artwork = post.coverImageUrl ? await cleanProductArtwork(source, `blog:${post.id}`) : await cleanImageArtwork(await readFile(path.join(process.cwd(), "public/social/innozanzi-share.png")), `blog:${post.id}`);
  const item = await prisma.socialContent.create({ data: { contentDate: socialContentDate(day), contentType: "INSIGHT", title: post.title, caption: response.output_text.trim(), imageUrl: await uploadArtwork(artwork, day, "INSIGHT"), imageAlt: `Clean social image for ${post.title}`, destinationUrl: url, sourceType: "BLOG", sourceId: post.id, fingerprint: fingerprint(["BLOG", post.id]), generationKey, createdById: actorId } });
  await emailContent([item.id], day, settings.recipientEmail, "A new insight is ready to promote. The image and caption are attached for manual posting."); return item;
}
