import { customerOrderPublicNote, customerOrderStatusLabel } from "@/domain/orders/lifecycle";
import { partnerCommissionDto, partnerOrderDto, type PartnerOrderDto } from "@/domain/partner-sales/redaction";
import { prisma } from "@/lib/prisma";

/**
 * The caller must obtain this context through requirePartnerSalesContext first.
 * Keeping the partnership id as the only scope accepted here makes it hard to
 * accidentally turn a partner read into an unscoped Orders query.
 */
export type PartnerOrderContext =
  | { partnership: { id: string } }
  | { partnershipId: string };

export type PartnerOrderTimelineEntry = {
  status: string;
  label: string;
  publicNote: string | null;
  occurredAt: string;
};

export type PartnerOrderTrackingProjection = PartnerOrderDto & {
  caseNumber: string | null;
  commission: ReturnType<typeof partnerCommissionDto> | null;
  statusLabel: string;
  timeline: readonly PartnerOrderTimelineEntry[];
};

function partnershipId(context: PartnerOrderContext) {
  const id = "partnership" in context ? context.partnership.id : context.partnershipId;
  if (!id?.trim()) throw new Error("Partner order access requires an authorized partnership.");
  return id;
}

const orderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  customerVisibleNotes: true,
  items: {
    select: {
      id: true,
      productName: true,
      sku: true,
      variantName: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  shipments: {
    select: {
      id: true,
      status: true,
      carrier: true,
      trackingNumber: true,
      trackingUrl: true,
      estimatedDeliveryAt: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  deliveryEvents: {
    select: { status: true, publicNote: true, occurredAt: true },
    orderBy: { occurredAt: "asc" as const },
  },
  partnerQuoteCase: { select: { caseNumber: true } },
  partnerCommission: {
    select: {
      id: true,
      status: true,
      method: true,
      currentAmount: true,
      quotedAmount: true,
      currency: true,
    },
  },
} as const;

type PersistedPartnerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customerVisibleNotes: string | null;
  items: readonly Record<string, unknown>[];
  shipments: readonly Record<string, unknown>[];
  deliveryEvents?: readonly {
    status: string;
    publicNote: string | null;
    occurredAt: Date;
  }[];
  partnerQuoteCase: { caseNumber: string } | null;
  partnerCommission: Record<string, unknown> | null;
};

function projectOrder(row: PersistedPartnerOrder): PartnerOrderTrackingProjection {
  const order = partnerOrderDto({
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    customerVisibleNotes: row.customerVisibleNotes,
    items: row.items,
    shipments: row.shipments,
  });

  return {
    ...order,
    caseNumber: row.partnerQuoteCase?.caseNumber ?? null,
    commission: row.partnerCommission ? partnerCommissionDto(row.partnerCommission) : null,
    statusLabel: customerOrderStatusLabel(row.status),
    timeline: (row.deliveryEvents ?? []).map((event) => ({
      status: event.status,
      label: customerOrderStatusLabel(event.status),
      publicNote: customerOrderPublicNote(event.publicNote),
      occurredAt: event.occurredAt.toISOString(),
    })),
  };
}

export async function partnerOrders(context: PartnerOrderContext) {
  const id = partnershipId(context);
  const rows = await prisma.order.findMany({
    where: { partnerQuoteCase: { partnershipId: id } },
    select: orderSelect,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => projectOrder(row as unknown as PersistedPartnerOrder));
}

export async function partnerOrder(context: PartnerOrderContext, orderNumber: string) {
  const id = partnershipId(context);
  const row = await prisma.order.findFirst({
    where: {
      orderNumber,
      partnerQuoteCase: { partnershipId: id },
    },
    select: orderSelect,
  });
  return row ? projectOrder(row as unknown as PersistedPartnerOrder) : null;
}
