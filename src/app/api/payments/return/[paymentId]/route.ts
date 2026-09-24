import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicSiteUrl } from "@/lib/public-site-url";
import { recordPaymentDiagnostic } from "@/domain/payments/diagnostics";
import { recoverPaymentAfterReturn } from "@/domain/payments/return-recovery";

const resultSchema = z.enum(["success", "cancelled", "error"]).catch("error");

async function handle(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  const paymentId = z.string().uuid().safeParse((await context.params).paymentId);
  const result = resultSchema.parse(new URL(request.url).searchParams.get("result"));
  if (!paymentId.success) return NextResponse.redirect(new URL("/account/orders", publicSiteUrl()), 303);
  const payment = await prisma.payment.findUnique({ where: { id: paymentId.data }, select: { id: true, orderId: true, status: true, partnerQuoteCaseId: true, order: { select: { orderNumber: true, status: true, paymentStatus: true } } } });
  if (!payment) return NextResponse.redirect(new URL("/account/orders", publicSiteUrl()), 303);
  // Browser returns are navigation hints, never authoritative payment evidence.
  // Record an untrusted navigation observation without changing payment/order state.
  try{await recordPaymentDiagnostic(payment.id,"browser-return",{result,verified:false,orderId:payment.orderId});}catch{console.warn("Payment browser return could not be recorded",{paymentId:payment.id});}
  const recovery=result==="success"?await recoverPaymentAfterReturn(payment.id):null;
  const notice = recovery==="paid"?"success":recovery==="failed"?"error":result === "success" ? "processing" : result;
  const destination = payment.partnerQuoteCaseId
    ? `/pay/${encodeURIComponent(payment.id)}?payment=${notice}`
    : "/account/orders/" + encodeURIComponent(payment.order.orderNumber) + "?payment=" + notice;
  return NextResponse.redirect(new URL(destination, publicSiteUrl()), 303);
}

export const GET = handle;
export const POST = handle;
