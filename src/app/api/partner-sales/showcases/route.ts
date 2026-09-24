import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePartnerSalesContext } from "@/domain/partner-sales/access";
import { createShowcase, PartnerEnquiryError } from "@/domain/partner-sales/showcases";
import { boundedFormData, browserMutationGuard } from "@/lib/security/request";
import { publicSiteUrl } from "@/lib/public-site-url";

export const runtime = "nodejs";

function target(status: string, message?: string) {
  const url = new URL("/account/partner/showcases", publicSiteUrl());
  url.searchParams.set("status", status);
  if (message) url.searchParams.set("message", message.slice(0, 180));
  return url;
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const guard = browserMutationGuard(request, "application/x-www-form-urlencoded");
  if (guard) return guard;

  let destination = target("error");
  try {
    const formData = await boundedFormData(request, 32_768);
    const partnershipId = z.string().uuid().parse(text(formData, "partnershipId"));
    const profileId = z.string().uuid().parse(text(formData, "profileId"));
    const { context } = await requirePartnerSalesContext(partnershipId);
    const assignmentIds = formData
      .getAll("assignmentIds")
      .filter((value): value is string => typeof value === "string")
      .map((value) => z.string().uuid().parse(value));
    const result = await createShowcase(
      {
        partnershipId,
        profileId,
        title: text(formData, "title"),
        introduction: text(formData, "introduction"),
        visibility: "PUBLIC",
        assignmentIds,
      },
      { user: { id: context.user.id }, partnershipId },
    );
    destination = target("created");
    destination.searchParams.set("showcase", result.publicId);
  } catch (error) {
    destination = target(
      "error",
      error instanceof PartnerEnquiryError || error instanceof z.ZodError
        ? "Please check the showcase fields and approved item selection."
        : "The showcase could not be saved.",
    );
  }
  return NextResponse.redirect(destination, 303);
}
