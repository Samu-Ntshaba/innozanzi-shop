"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BLOG_AUDIENCES, BLOG_TOPICS, blogLabel } from "@/domain/blog/constants";
import { normaliseBlogDraft } from "@/domain/blog/draft";
import { requirePermission } from "@/domain/auth/session";
import { getOpenAIClient } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase";
import { generateBlogSocialContent } from "@/domain/marketing/social-content";

const sourceSchema = z.object({ title: z.string().trim().min(1).max(240), url: z.string().url() });
const draftSchema = z.object({
  title: z.string().trim().min(10).max(120),
  excerpt: z.string().trim().min(40).max(320),
  content: z.string().trim().min(500).max(14000),
  coverImageAlt: z.string().trim().min(10).max(220),
  metaTitle: z.string().trim().min(10).max(70),
  metaDescription: z.string().trim().min(40).max(170),
});

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

async function uniqueSlug(title: string, currentId?: string) {
  const base = slugify(title) || `article-${Date.now()}`;
  let slug = base;
  for (let suffix = 2; await prisma.blogPost.findFirst({ where: { slug, ...(currentId ? { id: { not: currentId } } : {}) }, select: { id: true } }); suffix += 1) slug = `${base}-${suffix}`;
  return slug;
}

function findSources(value: unknown) {
  const found = new Map<string, { title: string; url: string }>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const object = node as Record<string, unknown>;
    if (typeof object.url === "string" && /^https?:\/\//.test(object.url)) {
      const title = typeof object.title === "string" && object.title.trim() ? object.title.trim() : new URL(object.url).hostname;
      found.set(object.url, { title: title.slice(0, 240), url: object.url });
    }
    Object.values(object).forEach(visit);
  };
  visit(value);
  return [...found.values()].slice(0, 12);
}

async function generateCover(title: string, alt: string, actorId: string) {
  const client = getOpenAIClient();
  const result = await client.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
    prompt: `Create a premium editorial photograph for an Innozanzi South African business technology article titled "${title}". ${alt}. Clean, credible corporate photography, subtle navy and cyan accents, realistic people or equipment where appropriate, natural lighting, uncluttered composition, generous negative space, no text, no logos, no watermarks.`,
    size: "1536x1024",
    quality: "medium",
    output_format: "webp",
  }, { timeout: 60_000 });
  const encoded = result.data?.[0]?.b64_json;
  if (!encoded) throw new Error("The image service returned no image.");
  const bytes = Buffer.from(encoded, "base64");
  const bucket = process.env.SUPABASE_PUBLIC_BUCKET ?? "product-images";
  const supabase = createSupabaseAdmin();
  if (!(await supabase.storage.getBucket(bucket)).data) {
    const made = await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: 8 * 1024 * 1024 });
    if (made.error) throw made.error;
  }
  const path = `blog/${new Date().getFullYear()}/${randomUUID()}.webp`;
  const uploaded = await supabase.storage.from(bucket).upload(path, bytes, { contentType: "image/webp", upsert: false });
  if (uploaded.error) throw uploaded.error;
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  await prisma.mediaAsset.create({ data: { bucket, path, publicUrl, title, altText: alt, mimeType: "image/webp", size: bytes.length, isSocialImage: true, createdById: actorId } });
  return publicUrl;
}

export async function generateBlogDraft(formData: FormData) {
  const ctx = await requirePermission("marketing.content.edit");
  let destination = "/admin/marketing/blog?generationError=failed";
  try {
    const input = z.object({
      topic: z.enum(BLOG_TOPICS.map(([value]) => value) as [string, ...string[]]),
      audience: z.enum(BLOG_AUDIENCES.map(([value]) => value) as [string, ...string[]]),
      direction: z.string().trim().max(500).optional(),
    }).parse(Object.fromEntries(formData));
    const response = await getOpenAIClient().responses.create({
      model: process.env.OPENAI_BLOG_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.6",
      store: false,
      background: true,
      tools: [{ type: "web_search" }],
      include: ["web_search_call.action.sources"],
      input: `Research and write a useful article for Innozanzi, a South African business technology procurement and support company.
Topic: ${blogLabel(input.topic)}
Audience: ${blogLabel(input.audience)}
Editorial direction: ${input.direction || "Choose a timely, practical angle based on credible current information."}

Use recent, reputable primary or authoritative sources. Do not invent prices, stock, partnerships, certifications, statistics, customer stories or product availability. Use South African context where relevant. Write 900-1,300 words in clear Markdown using ## headings, short paragraphs and occasional bullet lists. Do not include a sources section inside the article. Avoid hype and keyword stuffing. End with a practical, low-pressure conclusion. Return JSON only.`,
      text: {
        format: {
          type: "json_schema",
          name: "blog_draft",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string", minLength: 10, maxLength: 120 },
              excerpt: { type: "string", minLength: 40, maxLength: 320 },
              content: { type: "string", minLength: 500, maxLength: 14000 },
              coverImageAlt: { type: "string", minLength: 10, maxLength: 220 },
              metaTitle: { type: "string", minLength: 10, maxLength: 70 },
              metaDescription: { type: "string", minLength: 40, maxLength: 170 },
            },
            required: ["title", "excerpt", "content", "coverImageAlt", "metaTitle", "metaDescription"],
          },
        },
      },
    }, { timeout: 15_000 });
    const placeholderTitle = `Researching ${blogLabel(input.topic)}`;
    const slug = await uniqueSlug(`${placeholderTitle}-${Date.now()}`);
    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.blogPost.create({ data: {
        slug,
        title: placeholderTitle,
        excerpt: "Research is in progress. This page will update when the sourced draft is ready.",
        content: "Research is in progress. Please keep this draft open or refresh it shortly.",
        topic: input.topic,
        audience: input.audience,
        sources: { generation: { responseId: response.id, status: response.status } },
        coverImageUrl: null,
        status: "DRAFT",
        aiGenerated: true,
        createdById: ctx.user.id,
        updatedById: ctx.user.id,
      } });
      await tx.auditLog.create({ data: { actorId: ctx.user.id, action: "blog.ai.generate.queued", entityType: "BlogPost", entityId: created.id, after: { topic: input.topic, audience: input.audience, responseId: response.id } } });
      return created;
    });
    destination = `/admin/marketing/blog/${post.id}?generating=1`;
  } catch (error) {
    console.error("Blog draft generation failed", error);
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const reason = message.includes("source") ? "sources" : message.includes("timeout") || message.includes("timed out") ? "timeout" : "failed";
    destination = `/admin/marketing/blog?generationError=${reason}`;
  }
  redirect(destination);
}

type GenerationMetadata = { generation?: { responseId?: string; status?: string; error?: string } };

export async function refreshBlogGeneration(id: string) {
  await requirePermission("marketing.content.view");
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return null;
  const metadata = post.sources && !Array.isArray(post.sources) ? post.sources as GenerationMetadata : null;
  const responseId = metadata?.generation?.responseId;
  const generationStatus = metadata?.generation?.status ?? "";
  const recoverableValidationFailure = generationStatus === "failed" && /too_big|too_small|expected string/i.test(metadata?.generation?.error ?? "");
  if (!responseId || (!["queued", "in_progress"].includes(generationStatus) && !recoverableValidationFailure)) return post;
  try {
    const response = await getOpenAIClient().responses.retrieve(responseId, undefined, { timeout: 10_000 });
    if (response.status === "queued" || response.status === "in_progress") {
      if (response.status !== metadata?.generation?.status) {
        return prisma.blogPost.update({ where: { id }, data: { sources: { generation: { responseId, status: response.status } } } });
      }
      return post;
    }
    if (response.status !== "completed") {
      return prisma.blogPost.update({ where: { id }, data: { sources: { generation: { responseId, status: "failed", error: response.status } } } });
    }
    const draft = draftSchema.parse(normaliseBlogDraft(JSON.parse(response.output_text)));
    const sources = z.array(sourceSchema).parse(findSources(response));
    if (!sources.length) throw new Error("Research completed without verifiable source links.");
    const completed = await prisma.blogPost.update({ where: { id }, data: { ...draft, slug: await uniqueSlug(draft.title, id), sources, updatedById: post.updatedById } });
    await prisma.auditLog.create({ data: { actorId: post.updatedById ?? post.createdById, action: "blog.ai.generate.completed", entityType: "BlogPost", entityId: id, after: { responseId, sourceCount: sources.length } } });
    try { await generateBlogSocialContent(completed, post.updatedById ?? post.createdById); }
    catch (socialError) { console.error("Blog social suggestion failed", socialError); }
    return completed;
  } catch (error) {
    console.error("Blog background generation check failed", error);
    const message = error instanceof Error ? error.message.slice(0, 300) : "Generation failed";
    return prisma.blogPost.update({ where: { id }, data: { sources: { generation: { responseId, status: "failed", error: message } } } });
  }
}

export async function saveBlogPost(formData: FormData) {
  const ctx = await requirePermission("marketing.content.edit");
  const data = z.object({
    id: z.string().uuid(), title: z.string().trim().min(10).max(120), excerpt: z.string().trim().min(40).max(320),
    content: z.string().trim().min(300).max(20000), topic: z.string().min(2).max(80), audience: z.string().min(2).max(80),
    coverImageUrl: z.string().url().optional().or(z.literal("")), coverImageAlt: z.string().trim().max(220).optional(),
    metaTitle: z.string().trim().max(70).optional(), metaDescription: z.string().trim().max(170).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  }).parse(Object.fromEntries(formData));
  if (data.status === "PUBLISHED") await requirePermission("marketing.content.publish");
  if (data.coverImageUrl && !data.coverImageAlt) throw new Error("Alternative text is required when a cover image is used.");
  const previous = await prisma.blogPost.findUniqueOrThrow({ where: { id: data.id } });
  const post = await prisma.blogPost.update({ where: { id: data.id }, data: { ...data, coverImageUrl: data.coverImageUrl || null, coverImageAlt: data.coverImageAlt || null, metaTitle: data.metaTitle || null, metaDescription: data.metaDescription || null, slug: await uniqueSlug(data.title, data.id), publishedAt: data.status === "PUBLISHED" ? previous.publishedAt ?? new Date() : null, updatedById: ctx.user.id } });
  await prisma.auditLog.create({ data: { actorId: ctx.user.id, action: "blog.save", entityType: "BlogPost", entityId: post.id, before: { title: previous.title, status: previous.status }, after: { title: post.title, status: post.status } } });
  revalidatePath("/blog"); revalidatePath(`/blog/${post.slug}`); revalidatePath("/sitemap.xml"); revalidatePath(`/admin/marketing/blog/${post.id}`);
  redirect(`/admin/marketing/blog/${post.id}?saved=1`);
}

export async function regenerateBlogCover(formData: FormData) {
  const ctx = await requirePermission("marketing.content.edit");
  const id = z.string().uuid().parse(formData.get("id"));
  const post = await prisma.blogPost.findUniqueOrThrow({ where: { id } });
  const coverImageUrl = await generateCover(post.title, post.coverImageAlt ?? `Editorial image illustrating ${post.title}`, ctx.user.id);
  await prisma.blogPost.update({ where: { id }, data: { coverImageUrl, updatedById: ctx.user.id } });
  revalidatePath(`/admin/marketing/blog/${id}`); revalidatePath(`/blog/${post.slug}`);
  redirect(`/admin/marketing/blog/${id}?image=generated`);
}
