import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicSiteUrl } from "@/lib/public-site-url";

const resultSchema = z.enum(["success", "cancelled", "error"]).catch("error");

async function handle(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  const paymentId = z.string().uuid().safeParse((await context.params).paymentId);
  const result = resultSchema.parse(new URL(request.url).searchParams.get("result"));
  if (!paymentId.success) return NextResponse.redirect(new URL("/account/orders", publicSiteUrl()), 303);
  const payment = await prisma.payment.findUnique({ where: { id: paymentId.data }, select: { id: true, orderId: true, status: true, order: { select: { orderNumber: true, status: true, paymentStatus: true } } } });
  if (!payment) return NextResponse.redirect(new URL("/account/orders", publicSiteUrl()), 303);
  // Browser returns are navigation hints, never authoritative payment evidence.
  // Keep success, error and cancellation returns read-only.
  const notice = result === "success" ? "processing" : result;
  return NextResponse.redirect(new URL("/account/orders/" + encodeURIComponent(payment.order.orderNumber) + "?payment=" + notice, publicSiteUrl()), 303);
}

export const GET = handle;
export const POST = handle;
