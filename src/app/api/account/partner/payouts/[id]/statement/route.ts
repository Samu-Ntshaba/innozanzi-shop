import { NextResponse } from "next/server";
import { requirePartnerSalesContext } from "@/domain/partner-sales/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { partnership } = await requirePartnerSalesContext();
  const batch = await prisma.partnerPayoutBatch.findFirst({ where: { id, partnershipId: partnership.id, status: "PAID" }, select: { batchNumber: true, statementPayload: true } });
  if (!batch || !batch.statementPayload || typeof batch.statementPayload !== "object" || Array.isArray(batch.statementPayload)) return new NextResponse("Statement unavailable", { status: 404 });
  const csv = (batch.statementPayload as Record<string, unknown>).csv;
  if (typeof csv !== "string") return new NextResponse("Statement unavailable", { status: 404 });
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${batch.batchNumber}-statement.csv"`, "cache-control": "private, no-store" } });
}
