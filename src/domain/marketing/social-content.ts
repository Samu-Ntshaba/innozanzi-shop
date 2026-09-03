import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { brand } from "@/config/brand";
import { enqueueEmail } from "@/integrations/email/outbox";
import { getOpenAIClient } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase";

export const DAILY_SOCIAL_TYPES = ["PRODUCT", "SPECIAL", "PC_BUILDER", "GAMING"] as const;
export type DailySocialType = (typeof DAILY_SOCIAL_TYPES)[number];

const copySchema = z.object({
  posts: z.array(z.object({
    type: z.enum(DAILY_SOCIAL_TYPES),
    title: z.string().trim().min(5).max(90),
    caption: z.string().trim().min(40).max(1_500),
    imageAlt: z.string().trim().min(10).max(220),
  })).length(4),
});

type Source = { type: DailySocialType; sourceType: string; sourceId: string; name: string; detail: string; image?: string; url: string };

const clean = (value?: string | null) => (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const baseUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, "");
const dayString = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const dateOnly = (day: string) => new Date(`${day}T00:00:00.000Z`);
const fingerprint = (parts: string[]) => createHash("sha256").update(parts.join("|")).digest("hex");

export function authorisedMarketingCron(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function socialSettings() {
  const rows = await prisma.marketingSetting.findMany({ where: { key: { in: ["social.recipientEmail", "social.enabled", "social.generationHour", "social.brandDirection"] } } });
  const values = new Map(rows.map(row => [row.key, row.value]));
  return {
    recipientEmail: typeof values.get("social.recipientEmail") === "string" ? values.get("social.recipientEmail") as string : "",
    enabled: typeof values.get("social.enabled") === "boolean" ? values.get("social.enabled") as boolean : true,
    generationHour: typeof values.get("social.generationHour") === "number" ? values.get("social.generationHour") as number : 7,
    brandDirection: typeof values.get("social.brandDirection") === "string" ? values.get("social.brandDirection") as string : "Clean, confident and human. Navy, white and cyan. Real products and people; never glossy AI-looking imagery.",
  };
}

async function chooseSources(day: string): Promise<Source[]> {
  const recent = await prisma.socialContent.findMany({ where: { sourceId: { not: null }, createdAt: { gte: new Date(Date.now() - 90 * 86_400_000) } }, select: { sourceId: true } });
  const excluded = recent.flatMap(row => row.sourceId ? [row.sourceId] : []);
  const common = { active: true, availability: "IN_STOCK", stock: { gt: 0 }, images: { isEmpty: false }, id: excluded.length ? { notIn: excluded } : undefined };
  const now = new Date();
  let [product, special] = await Promise.all([
    prisma.supplierCatalogueProduct.findFirst({ where: common, orderBy: [{ sourceUpdatedAt: "desc" }, { stock: "desc" }] }),
    prisma.supplierCatalogueProduct.findFirst({ where: { ...common, promotionalPrice: { not: null }, AND: [{ OR: [{ promotionStartsAt: null }, { promotionStartsAt: { lte: now } }] }, { OR: [{ promotionEndsAt: null }, { promotionEndsAt: { gte: now } }] }] }, orderBy: [{ promotionEndsAt: "asc" }, { sourceUpdatedAt: "desc" }] }),
  ]);
  if (!product) product = await prisma.supplierCatalogueProduct.findFirst({ where: { active: true, availability: "IN_STOCK", stock: { gt: 0 }, images: { isEmpty: false } }, orderBy: { sourceUpdatedAt: "desc" } });
  if (!special) special = await prisma.supplierCatalogueProduct.findFirst({ where: { active: true, availability: "IN_STOCK", stock: { gt: 0 }, images: { isEmpty: false }, promotionalPrice: { not: null } }, orderBy: { sourceUpdatedAt: "desc" } });
  if (!product || !special) throw new Error("At least two active supplier products with images are required.");
  const productSource = (type: "PRODUCT" | "SPECIAL", item: typeof product): Source => ({ type, sourceType: "SUPPLIER_PRODUCT", sourceId: item.id, name: item.name, detail: clean(item.shortDescription ?? item.description).slice(0, 500), image: item.images[0], url: `${baseUrl()}/supplier-products/${item.slug}` });
  return [
    productSource("PRODUCT", product), productSource("SPECIAL", special),
    { type: "PC_BUILDER", sourceType: "FEATURE", sourceId: `PC_BUILDER:${day}`, name: "Build your PC", detail: "Innozanzi PC Workshop helps people select compatible components around their budget and intended use.", url: `${baseUrl()}/pc-builder` },
    { type: "GAMING", sourceType: "FEATURE", sourceId: `GAMING:${day}`, name: "Innozanzi Gaming", detail: "A practical place to discover gaming PCs, components, upgrades and accessories.", url: `${baseUrl()}/gaming` },
  ];
}

async function createCopy(sources: Source[]) {
  const response = await getOpenAIClient().responses.create({
    model: process.env.OPENAI_SOCIAL_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.6",
    store: false,
    input: `Write four daily social posts for Innozanzi Shop in South Africa using only the supplied facts. One post per type: PRODUCT, SPECIAL, PC_BUILDER, GAMING.\n\n${JSON.stringify(sources)}\n\nSound like a helpful, commercially sharp human—not an AI or a corporate brochure. Use plain South African English, short natural sentences, a clear customer benefit, and a direct but honest call to action. Sell without pressure. Never invent a price, discount percentage, stock quantity, specification, performance result, delivery promise or partnership. Include the supplied URL naturally. Use at most 3 relevant hashtags. For SPECIAL, say it is a special but do not state a price unless supplied. Return JSON only.`,
    text: { format: { type: "json_schema", name: "daily_social_posts", strict: true, schema: { type: "object", additionalProperties: false, properties: { posts: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", additionalProperties: false, properties: { type: { type: "string", enum: DAILY_SOCIAL_TYPES }, title: { type: "string", minLength: 5, maxLength: 90 }, caption: { type: "string", minLength: 40, maxLength: 1500 }, imageAlt: { type: "string", minLength: 10, maxLength: 220 } }, required: ["type", "title", "caption", "imageAlt"] } } }, required: ["posts"] } } },
  }, { timeout: 60_000 });
  const parsed = copySchema.parse(JSON.parse(response.output_text));
  if (new Set(parsed.posts.map(post => post.type)).size !== 4) throw new Error("The content model did not return all four post types.");
  return parsed.posts;
}

const xml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

async function brandedProductArtwork(source: Source, title: string) {
  const response = await fetch(source.image!);
  if (!response.ok) throw new Error(`Could not download product image (${response.status}).`);
  const product = Buffer.from(await response.arrayBuffer());
  const logo = await readFile(path.join(process.cwd(), "public/brand/innozanzi-shop-logo-header-v2.png"));
  const background = Buffer.from(`<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1080" height="1080" fill="#f7fafc"/><rect width="1080" height="20" fill="#00a7e7"/><rect y="820" width="1080" height="260" fill="#071b33"/><text x="70" y="890" fill="#74d4ff" font-size="25" font-family="Arial" font-weight="700">${source.type === "SPECIAL" ? "TODAY'S SPECIAL" : "PRODUCT SPOTLIGHT"}</text><text x="70" y="950" fill="white" font-size="44" font-family="Arial" font-weight="700">${xml(title.slice(0, 38))}</text><text x="70" y="1005" fill="#d5e3ef" font-size="25" font-family="Arial">Technology, made easier.</text></svg>`);
  return sharp(background).composite([
    { input: await sharp(product).resize(760, 650, { fit: "contain", background: "#f7fafc" }).png().toBuffer(), left: 160, top: 115 },
    { input: await sharp(logo).resize({ width: 250 }).png().toBuffer(), left: 70, top: 55 },
  ]).webp({ quality: 90 }).toBuffer();
}

async function brandedFeatureArtwork(source: Source, title: string, direction: string) {
  const result = await getOpenAIClient().images.generate({ model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2", prompt: `Create a realistic premium social photograph for a South African technology retailer. Subject: ${source.detail}. ${direction}. Natural lighting, believable equipment and people where relevant, editorial commercial photography, uncluttered, no text, no logo, no watermark, no futuristic fantasy, no synthetic AI aesthetic.`, size: "1024x1024", quality: "medium", output_format: "webp" }, { timeout: 90_000 });
  const encoded = result.data?.[0]?.b64_json;
  if (!encoded) throw new Error("The image service returned no feature image.");
  const logo = await readFile(path.join(process.cwd(), "public/brand/innozanzi-shop-logo-white.png"));
  const overlay = Buffer.from(`<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="55%" stop-color="#071b33" stop-opacity="0"/><stop offset="100%" stop-color="#071b33" stop-opacity=".96"/></linearGradient></defs><rect width="1080" height="1080" fill="url(#g)"/><text x="60" y="930" fill="white" font-size="46" font-family="Arial" font-weight="700">${xml(title.slice(0, 40))}</text><text x="60" y="988" fill="#d5e3ef" font-size="26" font-family="Arial">Technology, made easier.</text></svg>`);
  return sharp(Buffer.from(encoded, "base64")).resize(1080, 1080, { fit: "cover" }).composite([{ input: overlay }, { input: await sharp(logo).resize({ width: 270 }).png().toBuffer(), left: 60, top: 52 }]).webp({ quality: 90 }).toBuffer();
}

async function uploadArtwork(bytes: Buffer, day: string, type: string) {
  const bucket = process.env.SUPABASE_PUBLIC_BUCKET ?? "product-images";
  const storage = createSupabaseAdmin();
  if (!(await storage.storage.getBucket(bucket)).data) {
    const made = await storage.storage.createBucket(bucket, { public: true, fileSizeLimit: 8 * 1024 * 1024 });
    if (made.error) throw made.error;
  }
  const objectPath = `social/${day}/${type.toLowerCase()}-${randomUUID()}.webp`;
  const uploaded = await storage.storage.from(bucket).upload(objectPath, bytes, { contentType: "image/webp", upsert: false });
  if (uploaded.error) throw uploaded.error;
  return storage.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
}

function emailHtml(items: Array<{ title: string; caption: string; imageUrl: string; contentType: string }>, intro: string) {
  return `<div style="margin:auto;max-width:680px;font-family:Arial,sans-serif;color:#152536"><div style="padding:24px;border-radius:12px;background:#071b33;color:white"><img src="${baseUrl()}${brand.assets.lightLogo}" width="210" alt="Innozanzi"><h1 style="margin:22px 0 8px">Social content ready</h1><p style="margin:0;color:#d5e3ef">${intro}</p></div>${items.map(item => `<div style="margin-top:22px;padding:18px;border:1px solid #dbe3ea;border-radius:12px"><div style="font-size:12px;font-weight:bold;color:#087ea4">${item.contentType.replaceAll("_", " ")}</div><h2>${xml(item.title)}</h2><img src="${item.imageUrl}" alt="" style="width:100%;border-radius:8px"><p style="white-space:pre-wrap;line-height:1.6">${xml(item.caption)}</p><p><a href="${item.imageUrl}">Download full-size image</a></p></div>`).join("")}</div>`;
}

async function emailContent(ids: string[], day: string, recipient: string, intro: string) {
  const items = await prisma.socialContent.findMany({ where: { id: { in: ids } }, orderBy: { contentType: "asc" } });
  const attachments = await Promise.all(items.map(async item => ({ filename: `innozanzi-${item.contentType.toLowerCase()}-${day}.webp`, content: Buffer.from(await (await fetch(item.imageUrl)).arrayBuffer()), contentType: "image/webp" })));
  try {
    await enqueueEmail({ to: recipient, subject: items.length === 4 ? `Innozanzi daily social content · ${day}` : `Innozanzi insight social post · ${items[0]?.title}`, html: emailHtml(items, intro), text: items.map(item => `${item.title}\n${item.caption}\nImage: ${item.imageUrl}`).join("\n\n---\n\n"), attachments, category: "marketing", idempotencyKey: `social-content:${ids.join(":")}:${recipient.toLowerCase()}` });
    await prisma.socialContent.updateMany({ where: { id: { in: ids } }, data: { emailStatus: "SENT", emailedAt: new Date(), error: null } });
  } catch (error) {
    await prisma.socialContent.updateMany({ where: { id: { in: ids } }, data: { emailStatus: "FAILED", error: error instanceof Error ? error.message.slice(0, 2000) : "Email delivery failed" } });
    throw error;
  }
}

export async function generateDailySocialContent(options: { date?: Date; actorId?: string } = {}) {
  const settings = await socialSettings();
  if (!settings.enabled) return { status: "disabled", created: 0 };
  if (!settings.recipientEmail) throw new Error("Set the social content recipient email in Marketing settings first.");
  const day = dayString(options.date);
  const existing = await prisma.socialContent.findMany({ where: { generationKey: { startsWith: `daily:${day}:` } }, orderBy: { contentType: "asc" } });
  if (existing.length === 4) return { status: "already-generated", created: 0, items: existing };
  const sources = await chooseSources(day);
  const posts = await createCopy(sources);
  const created = [];
  for (const source of sources) {
    const generationKey = `daily:${day}:${source.type}`;
    const prior = await prisma.socialContent.findUnique({ where: { generationKey } });
    if (prior) { created.push(prior); continue; }
    const post = posts.find(item => item.type === source.type)!;
    const bytes = source.image ? await brandedProductArtwork(source, post.title) : await brandedFeatureArtwork(source, post.title, settings.brandDirection);
    const imageUrl = await uploadArtwork(bytes, day, source.type);
    created.push(await prisma.socialContent.create({ data: { contentDate: dateOnly(day), contentType: source.type, title: post.title, caption: post.caption, imageUrl, imageAlt: post.imageAlt, destinationUrl: source.url, sourceType: source.sourceType, sourceId: source.sourceId, fingerprint: fingerprint([source.type, source.sourceId, post.caption]), generationKey, createdById: options.actorId } }));
  }
  await emailContent(created.map(item => item.id), day, settings.recipientEmail, "Four ready-to-post ideas are attached. Review them, then publish manually on the channels that fit.");
  return { status: "generated", created: created.length, items: created };
}

export async function generateBlogSocialContent(post: { id: string; title: string; excerpt: string; coverImageUrl: string | null; slug: string }, actorId?: string | null) {
  const settings = await socialSettings();
  if (!settings.recipientEmail) return null;
  const generationKey = `blog:${post.id}`;
  const existing = await prisma.socialContent.findUnique({ where: { generationKey } });
  if (existing) return existing;
  const url = `${baseUrl()}/blog/${post.slug}`;
  const response = await getOpenAIClient().responses.create({ model: process.env.OPENAI_SOCIAL_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.6", store: false, input: `Write one natural, human social caption that sells the value of this Innozanzi insight without sounding like AI. Use plain English, a clear reason to read, this URL, and no more than 3 hashtags. Do not invent facts. Title: ${post.title}\nExcerpt: ${post.excerpt}\nURL: ${url}` }, { timeout: 30_000 });
  const caption = response.output_text.trim();
  const source: Source = { type: "PC_BUILDER", sourceType: "BLOG", sourceId: post.id, name: post.title, detail: post.excerpt, url };
  const bytes = post.coverImageUrl ? await brandedProductArtwork({ ...source, image: post.coverImageUrl }, post.title) : await brandedFeatureArtwork(source, post.title, settings.brandDirection);
  const day = dayString();
  const item = await prisma.socialContent.create({ data: { contentDate: dateOnly(day), contentType: "INSIGHT", title: post.title, caption, imageUrl: await uploadArtwork(bytes, day, "INSIGHT"), imageAlt: `Branded social artwork for ${post.title}`, destinationUrl: url, sourceType: "BLOG", sourceId: post.id, fingerprint: fingerprint(["BLOG", post.id]), generationKey, createdById: actorId } });
  await emailContent([item.id], day, settings.recipientEmail, "A new insight is ready to promote. The image and caption are attached for manual posting.");
  return item;
}
