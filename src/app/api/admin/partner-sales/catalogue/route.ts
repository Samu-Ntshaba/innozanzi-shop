import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import {
  assignCatalogueItem,
  PartnerCatalogueError,
  withdrawCatalogueItem,
} from "@/domain/partner-sales/catalogue";
import { publicSiteUrl } from "@/lib/public-site-url";
import { boundedFormData, browserMutationGuard } from "@/lib/security/request";

export const runtime = "nodejs";

const MAX_CATALOGUE_FORM_BYTES = 24_000;
const operationSchema = z.enum(["assign", "withdraw"]);
const partnershipIdSchema = z.string().uuid();

function canonicalTarget(partnershipId?: string) {
  const path = partnershipId
    ? `/admin/partnerships/partners/${partnershipId}/sales-channel/catalogue`
    : "/admin/partnerships/partners";
  return new URL(path, publicSiteUrl());
}

export async function POST(request: Request) {
  const guard = browserMutationGuard(
    request,
    "application/x-www-form-urlencoded",
  );
  if (guard) return guard;

  const actor = await requirePermission("partner_sales.catalogue.manage");
  let target = canonicalTarget();
  try {
    const formData = await boundedFormData(
      request,
      MAX_CATALOGUE_FORM_BYTES,
    );
    const partnershipId = partnershipIdSchema.parse(
      formData.get("partnershipId"),
    );
    target = canonicalTarget(partnershipId);
    const operation = operationSchema.parse(formData.get("operation"));
    if (operation === "assign") {
      await assignCatalogueItem(
        {
          partnershipId,
          sourceType: formData.get("sourceType"),
          sourceId: formData.get("sourceId"),
          visibleFrom: formData.get("visibleFrom") ?? "",
          visibleUntil: formData.get("visibleUntil") ?? "",
          presentationTitle: formData.get("presentationTitle") ?? "",
          presentationCopy: formData.get("presentationCopy") ?? "",
        },
        actor,
      );
      target.searchParams.set("status", "assigned");
    } else {
      await withdrawCatalogueItem(
        {
          partnershipId,
          assignmentId: formData.get("assignmentId"),
          reason: formData.get("reason"),
        },
        actor,
      );
      target.searchParams.set("status", "withdrawn");
    }
  } catch (error) {
    target.searchParams.set("status", "error");
    target.searchParams.set(
      "message",
      error instanceof PartnerCatalogueError
        ? error.message.slice(0, 300)
        : error instanceof z.ZodError
          ? (error.issues[0]?.message ??
              "Check the catalogue fields and try again.").slice(0, 300)
          : "The catalogue assignment could not be updated.",
    );
  }
  return NextResponse.redirect(target, 303);
}
