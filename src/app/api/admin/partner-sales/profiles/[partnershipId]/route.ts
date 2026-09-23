import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import {
  PartnerSalesProfileError,
  savePartnerSalesProfile,
  transitionPartnerSalesProfile,
} from "@/domain/partner-sales/profile-service";
import { publicSiteUrl } from "@/lib/public-site-url";
import { boundedFormData, browserMutationGuard } from "@/lib/security/request";

export const runtime = "nodejs";

const MAX_PROFILE_FORM_BYTES = 2 * 1024 * 1024 + 65_536;
const operationSchema = z.enum([
  "save",
  "submit-review",
  "approve",
  "changes-required",
  "suspend",
  "reactivate",
  "close",
]);

const transitionByOperation = {
  "submit-review": "ADMIN_REVIEW",
  approve: "ACTIVE",
  "changes-required": "CHANGES_REQUIRED",
  suspend: "SUSPENDED",
  reactivate: "ACTIVE",
  close: "CLOSED",
} as const;

function canonicalTarget(partnershipId: string) {
  return new URL(
    `/admin/partnerships/partners/${partnershipId}/sales-channel`,
    publicSiteUrl(),
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ partnershipId: string }> },
) {
  const guard = browserMutationGuard(request, "multipart/form-data");
  if (guard) return guard;

  const { partnershipId } = await params;
  const target = canonicalTarget(partnershipId);
  const actor = await requirePermission("partner_sales.profile.approve");
  try {
    const formData = await boundedFormData(request, MAX_PROFILE_FORM_BYTES);
    const operation = operationSchema.parse(formData.get("operation"));
    if (operation === "save") {
      const logoEntry = formData.get("logo");
      await savePartnerSalesProfile(
        {
          partnershipId,
          publicSlug: formData.get("publicSlug"),
          displayName: formData.get("displayName"),
          legalName: formData.get("legalName"),
          registrationNumber: formData.get("registrationNumber"),
          vatNumber: formData.get("vatNumber"),
          contactName: formData.get("contactName"),
          contactEmail: formData.get("contactEmail"),
          contactPhone: formData.get("contactPhone"),
          footerText: formData.get("footerText"),
          themePreset: formData.get("themePreset"),
          defaultCommissionMethod: formData.get("defaultCommissionMethod"),
          defaultCommissionValue: formData.get("defaultCommissionValue"),
          publicCatalogueEnabled: formData.get("publicCatalogueEnabled"),
          logo:
            logoEntry instanceof File && logoEntry.size > 0
              ? logoEntry
              : undefined,
        },
        actor,
      );
      target.searchParams.set("status", "saved");
    } else {
      await transitionPartnerSalesProfile(
        {
          partnershipId,
          status: transitionByOperation[operation],
          reason: formData.get("reason"),
        },
        actor,
      );
      target.searchParams.set("status", operation);
    }
  } catch (error) {
    target.searchParams.set("status", "error");
    target.searchParams.set(
      "message",
      error instanceof PartnerSalesProfileError
        ? error.message.slice(0, 300)
        : error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Check the profile fields and try again.").slice(0, 300)
          : "The sales profile could not be updated.",
    );
  }
  return NextResponse.redirect(target, 303);
}
