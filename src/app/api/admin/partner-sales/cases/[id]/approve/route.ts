import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { approvePartnerQuotation, PartnerPricingError } from "@/domain/partner-sales/cases";
import { publicSiteUrl } from "@/lib/public-site-url";
import { boundedFormData, browserMutationGuard } from "@/lib/security/request";

export const runtime = "nodejs";
const MAX_APPROVAL_FORM_BYTES = 32_000;

function target(id: string) { return new URL(`/admin/partnerships/sales-cases/${id}`, publicSiteUrl()); }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = browserMutationGuard(request, "application/x-www-form-urlencoded");
  if (guard) return guard;
  const actor = await requirePermission("partner_sales.pricing.approve");
  const destination = target(id);
  try {
    const form = await boundedFormData(request, MAX_APPROVAL_FORM_BYTES);
    const rawItems = String(form.get("items") ?? "[]");
    const itemDefaults = z.array(z.object({ id: z.string().min(1), unitPrice: z.coerce.number().positive() })).parse(JSON.parse(rawItems));
    const items = itemDefaults.map((item) => ({ id: item.id, unitPrice: z.coerce.number().positive().parse(form.get(`price-${item.id}`) ?? item.unitPrice) }));
    await approvePartnerQuotation({ caseId: z.string().uuid().parse(id), items, deliveryTotal: form.get("deliveryTotal") ?? 0, discountTotal: form.get("discountTotal") ?? 0, gateway: form.get("gateway") || undefined, validUntil: form.get("validUntil") || undefined, commissionMethod: form.get("commissionMethod") || undefined, commissionValue: form.get("commissionValue") || undefined, commissionOverrideReason: form.get("commissionOverrideReason") || undefined }, actor);
    destination.searchParams.set("status", "approved");
  } catch (error) {
    destination.searchParams.set("status", "error");
    destination.searchParams.set("message", (error instanceof PartnerPricingError || error instanceof z.ZodError) ? (error instanceof z.ZodError ? error.issues[0]?.message : error.message).slice(0, 300) : "The partner quotation could not be approved.");
  }
  return NextResponse.redirect(destination, 303);
}
