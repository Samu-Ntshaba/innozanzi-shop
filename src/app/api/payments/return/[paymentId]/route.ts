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
  if ((result === "cancelled" || result === "error") && payment.status === "PENDING") {
    const paymentStatus = result === "cancelled" ? "CANCELLED" : "FAILED";
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${payment.orderId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${payment.id}::uuid FOR UPDATE`;
      const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      if (current.status !== "PENDING") return;
      await tx.payment.update({ where: { id: payment.id }, data: { status: paymentStatus, failureReason: result === "cancelled" ? "Customer cancelled at payment provider." : "Customer returned from a provider error." } });
      if (payment.order.status === "AWAITING_PAYMENT" && payment.order.paymentStatus !== "PAID") {
        await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus } });
        await tx.orderStatusHistory.create({ data: { orderId: payment.orderId, fromStatus: "AWAITING_PAYMENT", toStatus: "AWAITING_PAYMENT", note: result === "cancelled" ? "Customer cancelled the Ozow payment attempt. The order remains unpaid and can be retried." : "The Ozow payment attempt was not completed. The order remains unpaid and can be retried." } });
      }
    });
  }
  const notice = result === "success" ? "processing" : result;
  return NextResponse.redirect(new URL("/account/orders/" + encodeURIComponent(payment.order.orderNumber) + "?payment=" + notice, publicSiteUrl()), 303);
}

export const GET = handle;
export const POST = handle;
