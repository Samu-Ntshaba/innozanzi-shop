"use server";

import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { getOpenAIClient } from "@/lib/openai";
import { marketingBusinessRules } from "@/config/business-facts";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({
  mode: z.enum(["SELECTED_PRODUCT", "RANDOM_PRODUCT", "BUSINESS_INSIGHT"]),
  productId: z.string().uuid().optional().or(z.literal("")),
  audience: z.enum(["SME", "CORPORATE", "EDUCATION", "PUBLIC_SECTOR", "NONPROFIT", "GENERAL_B2B"]),
  objective: z.enum(["LEAD_GENERATION", "PRODUCT_AWARENESS", "PROBLEM_SOLUTION", "TRUST", "ENGAGEMENT"]),
  direction: z.string().trim().max(500).optional(),
});

const outputSchema = z.object({
  headline: z.string().trim().min(5).max(180),
  post: z.string().trim().min(80).max(2500),
  callToAction: z.string().trim().min(5).max(220),
  hashtags: z.array(z.string().trim().regex(/^#[A-Za-z0-9]+$/)).min(3).max(6),
  imageBrief: z.string().trim().min(10).max(500),
  rationale: z.string().trim().min(20).max(600),
});

export type LinkedinContentState = {
  status: "idle" | "success" | "error";
  message?: string;
  content?: z.infer<typeof outputSchema> & { productName?: string; productUrl?: string; fullPost: string };
};

export const initialLinkedinContentState: LinkedinContentState = { status: "idle" };

const audienceLabels: Record<z.infer<typeof inputSchema>["audience"], string> = {
  SME: "South African small and medium businesses",
  CORPORATE: "corporate procurement and IT decision-makers",
  EDUCATION: "schools, colleges and education organisations",
  PUBLIC_SECTOR: "public-sector procurement and operational teams",
  NONPROFIT: "nonprofit and community organisations",
  GENERAL_B2B: "South African business decision-makers",
};

export async function generateLinkedinContent(_previous: LinkedinContentState, formData: FormData): Promise<LinkedinContentState> {
  const ctx = await requirePermission("marketing.content.edit");
  try {
    const input = inputSchema.parse(Object.fromEntries(formData));
    if (input.mode === "SELECTED_PRODUCT" && !input.productId) return { status: "error", message: "Choose a product before generating the post." };

    const product = input.mode === "BUSINESS_INSIGHT" ? null : await prisma.supplierCatalogueProduct.findFirst({
      where: input.mode === "SELECTED_PRODUCT"
        ? { id: input.productId, active: true }
        : { active: true, availability: "IN_STOCK", stock: { gt: 0 }, images: { isEmpty: false } },
      orderBy: input.mode === "RANDOM_PRODUCT" ? { sourceUpdatedAt: "desc" } : undefined,
      skip: input.mode === "RANDOM_PRODUCT" ? Math.floor(Math.random() * Math.max(1, await prisma.supplierCatalogueProduct.count({ where: { active: true, availability: "IN_STOCK", stock: { gt: 0 }, images: { isEmpty: false } } }))) : undefined,
      select: { id: true, name: true, brand: true, category: true, shortDescription: true, warranty: true, manufacturerSku: true, slug: true, images: true },
    });
    if (input.mode !== "BUSINESS_INSIGHT" && !product) return { status: "error", message: "No eligible product could be found. Check catalogue availability and try again." };

    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.innozanzi.co.za").replace(/\/$/, "");
    const productUrl = product ? `${site}/supplier-products/${product.slug}` : undefined;
    const factualContext = product ? JSON.stringify({
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.shortDescription?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 700),
      warranty: product.warranty,
      manufacturerSku: product.manufacturerSku,
      productUrl,
    }) : "No product is selected. Write a useful general B2B technology procurement or operational insight.";

    const response = await getOpenAIClient().responses.create({
      model: process.env.OPENAI_SOCIAL_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
      store: false,
      max_output_tokens: 1400,
      input: `You are the B2B content writer for Innozanzi Shop, a South African online technology retailer and business technology procurement company.
${marketingBusinessRules}

Create one LinkedIn draft for ${audienceLabels[input.audience]}.
Objective: ${input.objective.replaceAll("_", " ").toLowerCase()}.
Staff direction: ${input.direction || "Choose the most useful practical angle."}
Verified product context: ${factualContext}

Explain a real client problem, give practical value, and show how working with Innozanzi can simplify product selection, availability confirmation, quotations, delivery coordination and business support. Keep the tone credible, warm and commercially useful. Use short paragraphs and plain South African business English. Do not invent prices, savings, stock quantities, delivery times, partnerships, certifications, specifications, customer stories or performance claims. If there is no product, focus on a broadly useful procurement or workplace-technology insight. Do not claim that Innozanzi is the cheapest or best. Do not put hashtags inside the post field. Return JSON only.`,
      text: { format: { type: "json_schema", name: "linkedin_content_draft", strict: true, schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string" }, post: { type: "string" }, callToAction: { type: "string" },
          hashtags: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
          imageBrief: { type: "string" }, rationale: { type: "string" },
        },
        required: ["headline", "post", "callToAction", "hashtags", "imageBrief", "rationale"],
      } } },
    }, { timeout: 45_000 });

    const draft = outputSchema.parse(JSON.parse(response.output_text));
    const fullPost = [draft.post, draft.callToAction, productUrl, draft.hashtags.join(" ")].filter(Boolean).join("\n\n");
    await prisma.auditLog.create({ data: { actorId: ctx.user.id, action: "marketing.linkedin.ai.generate", entityType: product ? "SupplierCatalogueProduct" : "MarketingContent", entityId: product?.id, after: { mode: input.mode, audience: input.audience, objective: input.objective, productName: product?.name } } });
    return { status: "success", content: { ...draft, productName: product?.name, productUrl, fullPost } };
  } catch (error) {
    console.error("LinkedIn content generation failed", error);
    return { status: "error", message: error instanceof Error && error.message.includes("OPENAI_API_KEY") ? "OpenAI is not configured on this deployment." : "The content could not be generated. Please retry or adjust the direction." };
  }
}
