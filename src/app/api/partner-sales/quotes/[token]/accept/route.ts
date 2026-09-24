import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptPartnerQuotation, PartnerQuotationError } from "@/domain/partner-sales/partner-review";
import { createPartnerQuotePayment, PartnerQuotePaymentError } from "@/domain/partner-sales/payment";
import { boundedFormData, browserMutationGuard } from "@/lib/security/request";
import { publicSiteUrl } from "@/lib/public-site-url";

export const runtime = "nodejs";

function destination(token: string, status: string, message?: string) {
  const url = new URL(`/partner-quote/${encodeURIComponent(token)}`, publicSiteUrl());
  url.searchParams.set("status", status);
  if (message) url.searchParams.set("message", message.slice(0, 240));
  return url;
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guard = browserMutationGuard(request, "application/x-www-form-urlencoded");
  if (guard) return guard;
  try {
    const form = await boundedFormData(request, 8_192);
    const consent = z.literal("on").parse(String(form.get("consent") ?? ""));
    const accepted = await acceptPartnerQuotation(token, { consent: consent === "on", metadata: { userAgent: request.headers.get("user-agent")?.slice(0, 512) ?? undefined, forwardedFor: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 128) } });
    const provider = z.enum(["PAYFAST", "OZOW"]).optional().parse(form.get("provider") || undefined);
    if (provider) {
      const payment = await createPartnerQuotePayment(accepted.acceptanceId, provider);
      return NextResponse.redirect(new URL(`/pay/${payment.paymentId}`, publicSiteUrl()), 303);
    }
    return NextResponse.redirect(destination(token, "accepted"), 303);
  } catch (error) {
    const message = error instanceof PartnerQuotationError || error instanceof PartnerQuotePaymentError || error instanceof z.ZodError ? error.message : "The quotation could not be accepted.";
    return NextResponse.redirect(destination(token, "error", message), 303);
  }
}
