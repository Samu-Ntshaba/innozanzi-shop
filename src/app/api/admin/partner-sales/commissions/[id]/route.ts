import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { adjustCommission, holdCommission, reverseCommission } from "@/domain/partner-sales/commission-service";
import { publicSiteUrl } from "@/lib/public-site-url";
import { boundedFormData, browserMutationGuard } from "@/lib/security/request";

export const runtime = "nodejs";

const operationSchema = z.enum(["hold", "adjust", "reverse"]);
const reasonSchema = z.string().trim().min(10).max(1000);
const amountSchema = z.string().trim().regex(/^-?\d+(?:\.\d{1,4})?$/, "Enter an amount with up to four decimal places.").refine((value) => Number(value) !== 0, "Amount cannot be zero.");
const reversalAmountSchema = amountSchema.refine((value) => !value.startsWith("-"), "Reversal amount must be positive.");

function destination(id: string) {
  return new URL(`/admin/partnerships/commissions?commission=${id}`, publicSiteUrl());
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = browserMutationGuard(request, "application/x-www-form-urlencoded");
  if (guard) return guard;
  const { id } = await params;
  const target = destination(id);
  const actor = await requirePermission("partner_sales.commission.manage");
  try {
    const form = await boundedFormData(request, 32_000);
    const operation = operationSchema.parse(form.get("operation"));
    const reason = reasonSchema.parse(form.get("reason"));
    if (operation === "hold") {
      await holdCommission({ commissionId: z.string().uuid().parse(id), reason, actorId: actor.user.id, eventKey: `admin:hold:${id}:${reason}` });
    } else if (operation === "adjust") {
      await adjustCommission({ commissionId: z.string().uuid().parse(id), amount: amountSchema.parse(form.get("amount")), reason, actorId: actor.user.id, eventKey: `admin:adjust:${id}:${String(form.get("amount"))}:${reason}` });
    } else {
      const rawAmount = String(form.get("amount") ?? "").trim();
      await reverseCommission({ commissionId: z.string().uuid().parse(id), amount: rawAmount ? reversalAmountSchema.parse(rawAmount) : undefined, reason, actorId: actor.user.id, eventKey: `admin:reverse:${id}:${rawAmount || "full"}:${reason}` });
    }
    target.searchParams.set("status", "saved");
  } catch (error) {
    target.searchParams.set("status", "error");
    target.searchParams.set("message", error instanceof z.ZodError ? (error.issues[0]?.message ?? "Check the commission fields.").slice(0, 300) : error instanceof Error ? error.message.slice(0, 300) : "The commission ledger could not be updated.");
  }
  return NextResponse.redirect(target, 303);
}
