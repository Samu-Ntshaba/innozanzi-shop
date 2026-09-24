import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { approvePayoutBatch, cancelPayoutBatch, markPayoutBatchPaid } from "@/domain/partner-sales/payouts";
import { publicSiteUrl } from "@/lib/public-site-url";
import { boundedFormData, browserMutationGuard } from "@/lib/security/request";

export const runtime = "nodejs";

const idSchema = z.string().uuid();
const operationSchema = z.enum(["approve", "paid", "mark-paid", "cancel"]);
const reasonSchema = z.string().trim().min(10).max(1_000);
const referenceSchema = z.string().trim().min(3).max(120);

function destination(id: string) {
  return new URL(`/admin/partnerships/payouts/${id}`, publicSiteUrl());
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = browserMutationGuard(request, "application/x-www-form-urlencoded");
  if (guard) return guard;
  const { id: rawId } = await params;
  const target = destination(rawId);
  let id: string;
  let operation: z.infer<typeof operationSchema>;
  let form: FormData;
  try {
    id = idSchema.parse(rawId);
    form = await boundedFormData(request, 32_000);
    operation = operationSchema.parse(form.get("operation"));
  } catch (error) {
    target.searchParams.set("status", "error");
    target.searchParams.set("message", error instanceof z.ZodError ? (error.issues[0]?.message ?? "Check the payout fields.").slice(0, 300) : error instanceof Error ? error.message.slice(0, 300) : "The payout batch could not be updated.");
    return NextResponse.redirect(target, 303);
  }
  // Resolve authorization outside the mutation catch: Next's redirect-based
  // permission guard must remain an authorization response, not a saved-form error.
  const actor = await requirePermission(operation === "approve" || operation === "paid" || operation === "mark-paid" ? "partner_sales.payout.approve" : "partner_sales.payout.prepare");
  try {
    if (operation === "approve") {
      await approvePayoutBatch(id, actor.user.id);
    } else if (operation === "paid" || operation === "mark-paid") {
      const paymentDate = new Date(String(form.get("paymentDate") ?? ""));
      await markPayoutBatchPaid(id, {
        paymentReference: referenceSchema.parse(form.get("paymentReference")),
        paymentDate,
        proofDocumentId: z.string().uuid().parse(form.get("proofDocumentId")),
        paidById: actor.user.id,
      });
    } else {
      await cancelPayoutBatch(id, actor.user.id, reasonSchema.parse(form.get("reason")));
    }
    target.searchParams.set("status", "saved");
  } catch (error) {
    target.searchParams.set("status", "error");
    target.searchParams.set("message", error instanceof z.ZodError ? (error.issues[0]?.message ?? "Check the payout fields.").slice(0, 300) : error instanceof Error ? error.message.slice(0, 300) : "The payout batch could not be updated.");
  }
  return NextResponse.redirect(target, 303);
}
