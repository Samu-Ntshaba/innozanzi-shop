import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePartnerSalesContext } from "@/domain/partner-sales/access";
import { PartnerQuotationError, requestPartnerRevision, sendPartnerQuotation } from "@/domain/partner-sales/partner-review";
import { boundedFormData, browserMutationGuard } from "@/lib/security/request";
import { publicSiteUrl } from "@/lib/public-site-url";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function destination(caseNumber: string, status: string, message?: string) {
  const url = new URL(`/account/partner/sales/${encodeURIComponent(caseNumber)}`, publicSiteUrl());
  url.searchParams.set("status", status);
  if (message) url.searchParams.set("message", message.slice(0, 240));
  return url;
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const canonical = await prisma.partnerQuoteCase.findUnique({ where: { id }, select: { caseNumber: true } });
  const caseNumber = canonical?.caseNumber ?? id;
  const guard = browserMutationGuard(request, "application/x-www-form-urlencoded");
  if (guard) return guard;
  try {
    const form = await boundedFormData(request, 16_384);
    const action = z.enum(["revision", "send"]).parse(String(form.get("action") ?? ""));
    const partnershipId = z.string().uuid().parse(String(form.get("partnershipId") ?? ""));
    const { context } = await requirePartnerSalesContext(partnershipId);
    const actor = { user: { id: context.user.id }, partnershipId };
    if (action === "revision") {
      await requestPartnerRevision(id, actor, String(form.get("note") ?? ""));
      return NextResponse.redirect(destination(caseNumber, "revision-requested"), 303);
    }
    const result = await sendPartnerQuotation(id, actor);
    const url = destination(caseNumber, "sent");
    url.searchParams.set("email", result.emailQueued ? "queued" : "retry");
    return NextResponse.redirect(url, 303);
  } catch (error) {
    const message = error instanceof PartnerQuotationError || error instanceof z.ZodError ? error.message : "The quotation action could not be completed.";
    return NextResponse.redirect(destination(caseNumber, "error", message), 303);
  }
}
