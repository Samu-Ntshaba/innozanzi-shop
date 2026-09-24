import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createPartnerEnquiry, PartnerEnquiryError } from "@/domain/partner-sales/enquiries";
import { boundedFormData, browserMutationGuard, clientAddress } from "@/lib/security/request";
import { publicSiteUrl } from "@/lib/public-site-url";

export const runtime = "nodejs";

function redirectTarget(partnerSlug: string, publicId: string, status?: string) {
  const target = new URL(`/p/${encodeURIComponent(partnerSlug)}/s/${encodeURIComponent(publicId)}`, publicSiteUrl());
  if (status) target.searchParams.set("status", status);
  return target;
}

function stringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const guard = browserMutationGuard(request, "application/x-www-form-urlencoded");
  if (guard) return guard;

  let target = redirectTarget("partner", "showcase");
  try {
    const formData = await boundedFormData(request, 32_768);
    const partnerSlug = z.string().trim().min(3).max(100).regex(/^[a-z0-9-]+$/).parse(formData.get("partnerSlug"));
    const publicId = z.string().trim().min(3).max(100).parse(stringField(formData, "publicId"));
    target = redirectTarget(partnerSlug, publicId);
    const parsedItems = JSON.parse(String(formData.get("items") ?? "[]"));
    const idempotencyKey = stringField(formData, "idempotencyKey") || createHash("sha256").update(JSON.stringify({
      publicId,
      companyName: stringField(formData, "companyName"),
      contactName: stringField(formData, "contactName"),
      email: stringField(formData, "email").toLowerCase(),
      items: parsedItems,
    })).digest("hex");
    const result = await createPartnerEnquiry({
      publicId,
      accessToken: stringField(formData, "accessToken") || undefined,
      companyName: stringField(formData, "companyName"),
      contactName: stringField(formData, "contactName"),
      email: stringField(formData, "email"),
      phone: stringField(formData, "phone") || undefined,
      items: parsedItems,
      destination: stringField(formData, "destination"),
      timing: stringField(formData, "timing"),
      deliveryInstructions: stringField(formData, "deliveryInstructions"),
      consent: (formData.get("consent") === "on" || formData.get("consent") === "true") as true,
      idempotencyKey,
      rateLimitKey: clientAddress(request.headers),
    });
    void result;
    target.searchParams.set("submitted", "1");
  } catch (error) {
    target.searchParams.set("status", "error");
    if (error instanceof PartnerEnquiryError || error instanceof z.ZodError) {
      target.searchParams.set("message", "Please check the enquiry fields and try again.");
    } else {
      target.searchParams.set("message", "The enquiry could not be submitted.");
    }
  }
  return NextResponse.redirect(target, 303);
}
