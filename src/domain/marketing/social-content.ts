import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { brand } from "@/config/brand";
import { marketingBusinessRules } from "@/config/business-facts";
import { enqueueEmail } from "@/integrations/email/outbox";
import { mailDeliveryMode } from "@/integrations/email/provider";
import { getOpenAIClient } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase";

export const DAILY_SOCIAL_TYPES = ["PRODUCT", "PC_BUILDER", "GAMING"] as const;
export type DailySocialType = (typeof DAILY_SOCIAL_TYPES)[number];

const copySchema = z.object({
  posts: z.array(z.object({
    type: z.enum(DAILY_SOCIAL_TYPES),
    title: z.string().trim().min(5).max(70),
    caption: z.string().trim().min(40).max(650),
    imageAlt: z.string().trim().min(10).max(220),
  })).length(3),
});

type Source = { type: DailySocialType; sourceType: string; sourceId: string; name: string; detail: string; image?: string; images?: string[]; url: string };

const clean = (value?: string | null) => (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const baseUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl).replace(/\/$/, "");
const dayString = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const dateOnly = (day: string) => new Date(`${day}T00:00:00.000Z`);
const fingerprint = (parts: string[]) => createHash("sha256").update(parts.join("|")).digest("hex");
type GenerationStage="CATALOGUE"|"COPY"|"PRODUCT_ARTWORK"|"FEATURE_ARTWORK"|"STORAGE"|"EMAIL";
const stageError=(stage:GenerationStage,error:unknown)=>new Error(`SOCIAL_${stage}: ${error instanceof Error?error.message:"Unknown failure"}`);
async function atStage<T>(stage:GenerationStage,work:()=>Promise<T>){try{return await work()}catch(error){throw stageError(stage,error)}}
const retryable=(error:unknown)=>{const status=typeof error==="object"&&error&&"status" in error?Number((error as {status?:unknown}).status):0,message=error instanceof Error?error.message:"";return status===429||status>=500||/timeout|timed out|fetch failed|ECONNRESET|temporar/i.test(message)};
async function withTransientRetry<T>(work:()=>Promise<T>){try{return await work()}catch(error){if(!retryable(error))throw error;return work()}}

export async function socialGenerationReadiness(){const settings=await socialSettings();return{recipient:Boolean(settings.recipientEmail),openai:Boolean(process.env.OPENAI_API_KEY),storage:Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY),email:mailDeliveryMode()!=="unconfigured"}}

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
  const excluded = recent.flatMap(row => row.sourceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.sourceId) ? [row.sourceId] : []);
  const common = { active: true, availability: "IN_STOCK", stock: { gt: 0 }, images: { isEmpty: false }, id: excluded.length ? { notIn: excluded } : undefined };
  let product = await prisma.supplierCatalogueProduct.findFirst({ where: common, orderBy: [{ sourceUpdatedAt: "desc" }, { stock: "desc" }] });
  if (!product) product = await prisma.supplierCatalogueProduct.findFirst({ where: { active: true, availability: "IN_STOCK", stock: { gt: 0 }, images: { isEmpty: false } }, orderBy: { sourceUpdatedAt: "desc" } });
  if (!product) throw new Error("At least one active supplier product with images is required.");
  const productSource = (item: typeof product): Source => ({ type: "PRODUCT", sourceType: "SUPPLIER_PRODUCT", sourceId: item.id, name: item.name, detail: clean(item.shortDescription ?? item.description).slice(0, 500), image: item.images[0], images: item.images, url: `${baseUrl()}/supplier-products/${item.slug}` });
  return [
    productSource(product),
    { type: "PC_BUILDER", sourceType: "FEATURE", sourceId: `PC_BUILDER:${day}`, name: "Build your PC", detail: "Innozanzi PC Workshop helps people select compatible components around their budget and intended use.", url: `${baseUrl()}/build-a-pc` },
    { type: "GAMING", sourceType: "FEATURE", sourceId: `GAMING:${day}`, name: "Innozanzi Gaming", detail: "A practical place to discover gaming PCs, components, upgrades and accessories.", url: `${baseUrl()}/gaming` },
  ];
}

async function createCopy(sources: Source[]) {
  const response = await withTransientRetry(()=>getOpenAIClient().responses.create({
    model: process.env.OPENAI_SOCIAL_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.6",
    store: false,
    input: `Write exactly three ready-to-post social captions for Innozanzi Shop using only the supplied facts: one PRODUCT, one PC_BUILDER feature and one GAMING feature.\n\n${marketingBusinessRules}\n\nSources: ${JSON.stringify(sources)}\n\nTarget customers are in South Africa. Sound like a knowledgeable, helpful local technology retailer—not AI and not a corporate brochure. Each caption must be 220–500 characters including the supplied URL and hashtags. Use short natural paragraphs, one concrete customer benefit and one honest call to action. Never invent specifications, prices, stock, discounts or delivery promises. End with 2–4 genuinely relevant hashtags; include one natural South African technology or market hashtag such as #TechSouthAfrica, #SouthAfricanBusiness or #GamingSouthAfrica. Avoid generic hashtag stuffing. Return JSON only.`,
    text: { format: { type: "json_schema", name: "daily_social_posts", strict: true, schema: { type: "object", additionalProperties: false, properties: { posts: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", additionalProperties: false, properties: { type: { type: "string", enum: DAILY_SOCIAL_TYPES }, title: { type: "string", minLength: 5, maxLength: 70 }, caption: { type: "string", minLength: 40, maxLength: 650 }, imageAlt: { type: "string", minLength: 10, maxLength: 220 } }, required: ["type", "title", "caption", "imageAlt"] } } }, required: ["posts"] } } },
  }, { timeout: 60_000 }));
  const parsed = copySchema.parse(JSON.parse(response.output_text));
  if (new Set(parsed.posts.map(post => post.type)).size !== 3) throw new Error("The content model did not return all three post types.");
  return parsed.posts.map(post => ({ ...post, caption: normaliseCaption(post.caption, post.type) }));
}

function normaliseCaption(caption: string, type: DailySocialType) {
  const tags = [...new Set(caption.match(/#[A-Za-z0-9]+/g) ?? [])];
  const fallback:Record<DailySocialType,string[]>={
    PRODUCT:["#TechSouthAfrica","#ShopTech"],
    PC_BUILDER:["#BuildAPC","#TechSouthAfrica"],
    GAMING:["#GamingSouthAfrica","#PCGaming"],
  };
  const selected = [...new Set([...tags,...fallback[type]])].slice(0, 4);
  const body = caption.replace(/(?:\s*#[A-Za-z0-9]+)+\s*$/g, "").replace(/\s+/g, " ").trim().slice(0, 520).trim();
  return `${body}\n\n${selected.join(" ")}`.trim();
}

const xml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

function titleLines(value: string, max = 29) {
  const words=value.trim().split(/\s+/),lines:string[]=[];
  for(const word of words){const current=lines.at(-1);if(!current||`${current} ${word}`.length>max)lines.push(word);else lines[lines.length-1]=`${current} ${word}`;}
  return lines.slice(0,2).map((line,index)=>`<text x="70" y="${1090+index*62}" fill="white" font-size="48" font-family="Arial" font-weight="700">${xml(line)}</text>`).join("");
}

async function bestProductImage(source: Source) {
  const candidates=[...new Set([...(source.images??[]),...(source.image?[source.image]:[])])].slice(0,6);
  const images=await Promise.all(candidates.map(async url=>{try{const response=await fetch(url);if(!response.ok)return null;const bytes=Buffer.from(await response.arrayBuffer());const metadata=await sharp(bytes).metadata();return{bytes,pixels:(metadata.width??0)*(metadata.height??0)}}catch{return null}}));
  const best=images.filter((item):item is NonNullable<typeof item>=>Boolean(item)).sort((a,b)=>b.pixels-a.pixels)[0];
  if(!best)throw new Error("Could not download a usable product image.");
  return best.bytes;
}

async function brandedProductArtwork(source: Source, title: string) {
  const product = await bestProductImage(source);
  const logo = await readFile(path.join(process.cwd(), "public/brand/innozanzi-shop-logo-white.png"));
  const background = Buffer.from(`<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg"><rect width="1080" height="1350" fill="#f7fafc"/><rect width="1080" height="18" fill="#00a7e7"/><rect y="960" width="1080" height="390" fill="#071b33"/><text x="70" y="1020" fill="#74d4ff" font-size="25" font-family="Arial" font-weight="700" letter-spacing="2">PRODUCT SPOTLIGHT</text>${titleLines(title)}<text x="70" y="1275" fill="#d5e3ef" font-size="27" font-family="Arial">Technology, made easier.</text></svg>`);
  return sharp(background).composite([
    { input: await sharp(product).rotate().resize(860, 720, { fit: "contain", background: {r:247,g:250,b:252,alpha:1}, kernel:"lanczos3" }).sharpen({sigma:1}).png().toBuffer(), left: 110, top: 190 },
    { input: await sharp(logo).resize({ width: 290 }).png().toBuffer(), left: 55, top: 42 },
  ]).webp({ quality: 96, smartSubsample: true }).toBuffer();
}

async function brandedFeatureArtwork(source: Source, title: string, direction: string) {
  const result = await withTransientRetry(()=>getOpenAIClient().images.generate({ model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2", prompt: `Create a premium, photorealistic vertical social campaign photograph for a trusted South African technology retailer. Subject: ${source.detail}. ${direction}. Show believable current technology and a realistic South African home, work or gaming context where appropriate. Strong natural composition with clear subject separation and generous safe space for a branded lower overlay. Natural lighting, accurate anatomy and equipment, editorial commercial photography, no text, no logo, no watermark, no futuristic fantasy, no synthetic AI aesthetic.`, size: "1024x1536", quality: "high", output_format: "webp" }, { timeout: 120_000 }));
  const encoded = result.data?.[0]?.b64_json;
  if (!encoded) throw new Error("The image service returned no feature image.");
  const logo = await readFile(path.join(process.cwd(), "public/brand/innozanzi-shop-logo-white.png"));
  const overlay = Buffer.from(`<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="48%" stop-color="#071b33" stop-opacity="0"/><stop offset="100%" stop-color="#071b33" stop-opacity=".98"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#g)"/>${titleLines(title)}<text x="70" y="1275" fill="#d5e3ef" font-size="27" font-family="Arial">Technology, made easier.</text></svg>`);
  return sharp(Buffer.from(encoded, "base64")).resize(1080, 1350, { fit: "cover", position:"attention" }).composite([{ input: overlay }, { input: await sharp(logo).resize({ width: 290 }).png().toBuffer(), left: 55, top: 42 }]).webp({ quality: 96, smartSubsample:true }).toBuffer();
}

async function uploadArtwork(bytes: Buffer, day: string, type: string) {
  const bucket = process.env.SUPABASE_PUBLIC_BUCKET ?? "product-images";
  const storage = createSupabaseAdmin();
  if (!(await storage.storage.getBucket(bucket)).data) {
    const made = await storage.storage.createBucket(bucket, { public: true, fileSizeLimit: 8 * 1024 * 1024 });
    if (made.error) throw made.error;
  }
  const objectPath = `social/${day}/${type.toLowerCase()}-${randomUUID()}.webp`;
  const uploaded = await withTransientRetry(()=>storage.storage.from(bucket).upload(objectPath, bytes, { contentType: "image/webp", upsert: false }));
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
    await enqueueEmail({ to: recipient, subject: items.length === 3 ? `Innozanzi daily social content · ${day}` : `Innozanzi insight social post · ${items[0]?.title}`, html: emailHtml(items, intro), text: items.map(item => `${item.title}\n${item.caption}\nImage: ${item.imageUrl}`).join("\n\n---\n\n"), attachments, category: "marketing", idempotencyKey: `social-content:${ids.join(":")}:${recipient.toLowerCase()}` });
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
  const existing = await prisma.socialContent.findMany({ where: { generationKey: { startsWith: `daily:${day}:` }, contentType: { in: [...DAILY_SOCIAL_TYPES] } }, orderBy: { contentType: "asc" } });
  if (existing.length === 3) {if(existing.some(item=>item.emailStatus!=="SENT"))await atStage("EMAIL",()=>emailContent(existing.map(item=>item.id),day,settings.recipientEmail,"Three ready-to-post product and feature ideas are attached. Review them, then publish manually on the channels that fit."));return { status: "already-generated", created: 0, items: existing }}
  const sources = await atStage("CATALOGUE",()=>chooseSources(day));
  const posts = await atStage("COPY",()=>createCopy(sources));
  const created:typeof existing = [];
  for (const source of sources) {
    const generationKey = `daily:${day}:${source.type}`;
    const prior = await prisma.socialContent.findUnique({ where: { generationKey } });
    if (prior) { created.push(prior); continue; }
    const post = posts.find(item => item.type === source.type)!;
    const bytes = source.image ? await atStage("PRODUCT_ARTWORK",()=>brandedProductArtwork(source,post.title)) : await atStage("FEATURE_ARTWORK",()=>brandedFeatureArtwork(source,post.title,settings.brandDirection));
    const imageUrl = await atStage("STORAGE",()=>uploadArtwork(bytes,day,source.type));
    created.push(await prisma.socialContent.create({ data: { contentDate: dateOnly(day), contentType: source.type, title: post.title, caption: post.caption, imageUrl, imageAlt: post.imageAlt, destinationUrl: source.url, sourceType: source.sourceType, sourceId: source.sourceId, fingerprint: fingerprint([source.type, source.sourceId, post.caption]), generationKey, createdById: options.actorId } }));
  }
  await atStage("EMAIL",()=>emailContent(created.map(item=>item.id),day,settings.recipientEmail,"Three ready-to-post product and feature ideas are attached. Review them, then publish manually on the channels that fit."));
  return { status: "generated", created: created.length, items: created };
}

export async function generateBlogSocialContent(post: { id: string; title: string; excerpt: string; coverImageUrl: string | null; slug: string }, actorId?: string | null) {
  const settings = await socialSettings();
  if (!settings.recipientEmail) return null;
  const generationKey = `blog:${post.id}`;
  const existing = await prisma.socialContent.findUnique({ where: { generationKey } });
  if (existing) return existing;
  const url = `${baseUrl()}/blog/${post.slug}`;
  const response = await getOpenAIClient().responses.create({ model: process.env.OPENAI_SOCIAL_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.6", store: false, input: `Write one natural, human social caption that sells the value of this Innozanzi insight without sounding like AI. ${marketingBusinessRules} Use plain English, a clear reason to read, this URL, and no more than 3 hashtags. Title: ${post.title}\nExcerpt: ${post.excerpt}\nURL: ${url}` }, { timeout: 30_000 });
  const caption = response.output_text.trim();
  const source: Source = { type: "PC_BUILDER", sourceType: "BLOG", sourceId: post.id, name: post.title, detail: post.excerpt, url };
  const bytes = post.coverImageUrl ? await brandedProductArtwork({ ...source, image: post.coverImageUrl }, post.title) : await brandedFeatureArtwork(source, post.title, settings.brandDirection);
  const day = dayString();
  const item = await prisma.socialContent.create({ data: { contentDate: dateOnly(day), contentType: "INSIGHT", title: post.title, caption, imageUrl: await uploadArtwork(bytes, day, "INSIGHT"), imageAlt: `Branded social artwork for ${post.title}`, destinationUrl: url, sourceType: "BLOG", sourceId: post.id, fingerprint: fingerprint(["BLOG", post.id]), generationKey, createdById: actorId } });
  await emailContent([item.id], day, settings.recipientEmail, "A new insight is ready to promote. The image and caption are attached for manual posting.");
  return item;
}
