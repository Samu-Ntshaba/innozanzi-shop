import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import {
  hasPermission,
  type PermissionGrant,
} from "@/domain/auth/permissions";
import type { CommerceSettings } from "@/domain/commerce/config";
import { getCommerceSettings } from "@/domain/commerce/settings";
import { partnerSalesSettings } from "@/domain/partner-sales/settings";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  localProductAvailability,
  partnerAvailabilityFingerprint,
  supplierPromotionEvidence,
} from "@/domain/partner-sales/availability";
import {
  assertPartnerCatalogueSourceSupported,
  isPartnerCatalogueSourceSupported,
} from "@/domain/partner-sales/catalogue-policy";

const SOURCE_TYPES = [
  "PRODUCT",
  "SUPPLIER_CATALOGUE_PRODUCT",
  "COMBO",
] as const;

type AssignableCatalogueSourceType = (typeof SOURCE_TYPES)[number];
type CatalogueSourceType = AssignableCatalogueSourceType | "CAMPAIGN";
type CatalogueDatabase = Pick<
  Prisma.TransactionClient,
  "product" | "supplierCatalogueProduct" | "comboCampaign"
>;

export type PartnerCatalogueActor = {
  user: { id: string };
  grants: readonly PermissionGrant[];
  isSuperAdministrator: boolean;
};

export type PublicPartnerCatalogueDto = {
  profile: {
    publicSlug: string;
    displayName: string;
    contactEmail: string | null;
    contactPhone: string | null;
    footerText: string | null;
    themePreset: string;
    logoUrl: string | null;
  };
  items: Array<{
    assignmentId: string;
    title: string;
    description: string | null;
    sku: string | null;
    image: { url: string; altText: string | null } | null;
  }>;
};

export class PartnerCatalogueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerCatalogueError";
  }
}

const executableContent = /[<>]|javascript:|data:text\/html|on\w+\s*=/i;
const plainText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (value) => !executableContent.test(value),
      "Catalogue presentation fields must be plain text.",
    );
const optionalPlainText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    plainText(max).optional(),
  );
const optionalDate = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.date().optional(),
);

const assignSchema = z
  .object({
    partnershipId: z.string().uuid(),
    sourceType: z.enum(SOURCE_TYPES, {
      error: "Unsupported catalogue source type. Campaign sources are not available.",
    }),
    sourceId: z.string().uuid(),
    visibleFrom: optionalDate,
    visibleUntil: optionalDate,
    presentationTitle: optionalPlainText(180),
    presentationCopy: optionalPlainText(1200),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.visibleFrom &&
      value.visibleUntil &&
      value.visibleUntil <= value.visibleFrom
    ) {
      context.addIssue({
        code: "custom",
        path: ["visibleUntil"],
        message: "The visibility end must be after the start.",
      });
    }
  });

const withdrawSchema = z
  .object({
    partnershipId: z.string().uuid(),
    assignmentId: z.string().uuid(),
    reason: plainText(1000).min(5),
  })
  .strict();

export type AssignCatalogueItemInput = z.input<typeof assignSchema>;
export type WithdrawCatalogueItemInput = z.input<typeof withdrawSchema>;

type ResolvedSource = {
  title: string;
  description: string | null;
  sku: string | null;
  media: Array<{ url: string; altText: string | null }>;
  fingerprint: string;
  sourceSnapshot?: Record<string, unknown>;
};

function assertCataloguePermission(actor: PartnerCatalogueActor) {
  if (
    !hasPermission(
      actor.grants,
      "partner_sales.catalogue.manage",
      actor.isSuperAdministrator,
    )
  ) {
    throw new PartnerCatalogueError(
      "You do not have permission to manage partner catalogues.",
    );
  }
}

function decimalString(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const result = value.toString();
    return Number.isFinite(Number(result)) ? result : null;
  }
  if (typeof value === "string" || typeof value === "number") {
    return Number.isFinite(Number(value)) ? String(value) : null;
  }
  return null;
}

const manualProductAvailability = localProductAvailability;

async function resolveProductSource(
  db: CatalogueDatabase,
  sourceId: string,
): Promise<ResolvedSource | null> {
  const product = await db.product.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      name: true,
      sku: true,
      shortDescription: true,
      status: true,
      deletedAt: true,
      isTestData: true,
      stockStatus: true,
      costPrice: true,
      images: {
        where: { isPrimary: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { path: true, altText: true, isPrimary: true },
      },
      inventory: {
        select: { id: true, onHand: true, reserved: true },
        orderBy: { id: "asc" },
      },
      variants: {
        select: {
          id: true,
          isActive: true,
          costPrice: true,
          inventory: { select: { onHand: true, reserved: true } },
        },
        orderBy: { id: "asc" },
      },
      suppliers: {
        where: { isPreferred: true },
        take: 1,
        select: { costPrice: true },
      },
    },
  });
  if (!product) return null;
  const current = manualProductAvailability(product);
  if (
    product.status !== "PUBLISHED" ||
    product.deletedAt ||
    product.isTestData ||
    !["IN_STOCK", "LOW_STOCK"].includes(product.stockStatus) ||
    !product.images[0] ||
    !current.cost ||
    Number(current.cost) <= 0 ||
    current.available <= 0
  ) {
    return null;
  }
  return {
    title: product.name,
    description: product.shortDescription,
    sku: product.sku,
    media: [
      {
        url: product.images[0].path,
        altText: product.images[0].altText,
      },
    ],
    fingerprint: partnerAvailabilityFingerprint({
      sourceType: "PRODUCT",
      sourceId: product.id,
      baseCost: current.cost,
      effectiveCost: current.cost,
      available: current.available,
      state: product.stockStatus,
      details: { costEvidence: current.costEvidence },
    }),
  };
}

type SupplierEligibilityProduct = {
  active: boolean;
  displayPreferred: boolean;
  availability: string;
  stock: number;
  costPrice: unknown;
  recommendedRetail: unknown;
  promotionalPrice: unknown;
  promotionStartsAt: Date | null;
  promotionEndsAt: Date | null;
  images: string[];
  lastSeenAt: Date;
  feed: { enabled: boolean; lastSuccessAt: Date | null };
  supplier: { purchasingEnabled: boolean; approvalStatus: string };
};

async function supplierEligibility(
  product: {
    active: SupplierEligibilityProduct["active"];
    displayPreferred: SupplierEligibilityProduct["displayPreferred"];
    availability: SupplierEligibilityProduct["availability"];
    stock: SupplierEligibilityProduct["stock"];
    costPrice: SupplierEligibilityProduct["costPrice"];
    recommendedRetail: SupplierEligibilityProduct["recommendedRetail"];
    promotionalPrice: SupplierEligibilityProduct["promotionalPrice"];
    promotionStartsAt: SupplierEligibilityProduct["promotionStartsAt"];
    promotionEndsAt: SupplierEligibilityProduct["promotionEndsAt"];
    images: SupplierEligibilityProduct["images"];
    lastSeenAt: SupplierEligibilityProduct["lastSeenAt"];
    feed: SupplierEligibilityProduct["feed"];
    supplier: SupplierEligibilityProduct["supplier"];
  },
  now: Date,
  settings: CommerceSettings,
) {
  const freshSince =
    now.getTime() - settings.freshnessHours * 60 * 60 * 1000;
  const baseCost = decimalString(product.costPrice);
  const promotionalCost = decimalString(product.promotionalPrice);
  if (!baseCost || Number(baseCost) <= 0) {
    return {
      baseCost,
      effectiveCost: null,
      promotion: {
        active: false,
        price: promotionalCost,
        startsAt: product.promotionStartsAt?.toISOString() ?? null,
        endsAt: product.promotionEndsAt?.toISOString() ?? null,
      },
      eligible: false,
    };
  }
  const promotion = supplierPromotionEvidence({
    costPrice: baseCost,
    promotionalPrice: promotionalCost,
    promotionStartsAt: product.promotionStartsAt,
    promotionEndsAt: product.promotionEndsAt,
    now,
  });
  const effectiveCost = promotion.effectiveCost;
  return {
    baseCost,
    effectiveCost,
    promotion: {
        active: promotion.promotionActive,
      price: promotionalCost,
      startsAt: product.promotionStartsAt?.toISOString() ?? null,
      endsAt: product.promotionEndsAt?.toISOString() ?? null,
    },
    eligible: Boolean(
      product.active &&
        product.displayPreferred &&
        product.availability === "IN_STOCK" &&
        product.stock > 0 &&
        effectiveCost &&
        Number(effectiveCost) > 0 &&
        product.images.length > 0 &&
        product.lastSeenAt.getTime() >= freshSince &&
        product.feed.enabled &&
        product.feed.lastSuccessAt &&
        product.feed.lastSuccessAt.getTime() >= freshSince &&
        product.supplier.purchasingEnabled &&
        product.supplier.approvalStatus === "APPROVED",
    ),
  };
}

async function resolveSupplierSource(
  db: CatalogueDatabase,
  sourceId: string,
  now: Date,
): Promise<ResolvedSource | null> {
  const [product, settings] = await Promise.all([
    db.supplierCatalogueProduct.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        name: true,
        manufacturerSku: true,
        shortDescription: true,
        description: true,
        active: true,
        displayPreferred: true,
        availability: true,
        stock: true,
        costPrice: true,
        recommendedRetail: true,
        promotionalPrice: true,
        promotionStartsAt: true,
        promotionEndsAt: true,
        images: true,
        lastSeenAt: true,
        feed: { select: { enabled: true, lastSuccessAt: true } },
        supplier: {
          select: { purchasingEnabled: true, approvalStatus: true },
        },
      },
    }),
    getCommerceSettings(),
  ]);
  if (!product) return null;
  const current = await supplierEligibility(product, now, settings);
  if (!current.eligible || !current.effectiveCost) return null;
  return {
    title: product.name,
    description: product.shortDescription ?? product.description,
    // Supplier-specific SKUs and identities are deliberately not public.
    sku: product.manufacturerSku,
    // Raw supplier media can reveal commercially sensitive hosts and paths.
    // It is never snapshotted or published; a separately persisted, approved
    // Innozanzi asset is required before supplier artwork can be shown.
    media: [],
    fingerprint: partnerAvailabilityFingerprint({
      sourceType: "SUPPLIER_CATALOGUE_PRODUCT",
      sourceId: product.id,
      baseCost: current.baseCost,
      effectiveCost: current.effectiveCost,
      promotionalCost: current.promotion.price,
      promotionActive: current.promotion.active,
      promotionStartsAt: current.promotion.startsAt,
      promotionEndsAt: current.promotion.endsAt,
      available: product.stock,
      state: product.availability,
    }),
    sourceSnapshot: { sourceType: "SUPPLIER_CATALOGUE_PRODUCT", sourceId: product.id, cost: current.effectiveCost, available: product.stock },
  };
}

async function resolveSource(
  db: CatalogueDatabase,
  sourceType: CatalogueSourceType,
  sourceId: string,
  now: Date,
) {
  if (sourceType === "PRODUCT") {
    return resolveProductSource(db, sourceId);
  }
  if (sourceType === "SUPPLIER_CATALOGUE_PRODUCT") {
    return resolveSupplierSource(db, sourceId, now);
  }
  assertPartnerCatalogueSourceSupported(sourceType);
  return null;
}

type AssignmentSnapshotInput = {
  id: string;
  profileId: string;
  sourceType: CatalogueSourceType;
  sourceId: string;
  status: string;
  visibleFrom: Date | null;
  visibleUntil: Date | null;
  presentationTitle: string | null;
  presentationCopy: string | null;
  mediaSnapshot: unknown;
  sourceSnapshot?: unknown;
  availabilityFingerprint: string;
  approvedById: string | null;
  approvedAt: Date | null;
  withdrawnAt: Date | null;
};

function assignmentSnapshot(assignment: AssignmentSnapshotInput) {
  return {
    id: assignment.id,
    profileId: assignment.profileId,
    sourceType: assignment.sourceType,
    sourceId: assignment.sourceId,
    status: assignment.status,
    visibleFrom: assignment.visibleFrom?.toISOString() ?? null,
    visibleUntil: assignment.visibleUntil?.toISOString() ?? null,
    presentationTitle: assignment.presentationTitle,
    presentationCopy: assignment.presentationCopy,
    mediaSnapshot: safeMediaSnapshot(assignment.mediaSnapshot),
    sourceSnapshot: assignment.sourceSnapshot ?? null,
    availabilityFingerprint: assignment.availabilityFingerprint,
    approvedById: assignment.approvedById,
    approvedAt: assignment.approvedAt?.toISOString() ?? null,
    withdrawnAt: assignment.withdrawnAt?.toISOString() ?? null,
  };
}

function safeMediaSnapshot(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const media = entry as Record<string, unknown>;
    if (typeof media.url !== "string" || !media.url.trim()) return [];
    return [
      {
        url: media.url,
        altText: typeof media.altText === "string" ? media.altText : null,
      },
    ];
  });
}

export async function assignCatalogueItem(
  input: unknown,
  actor: PartnerCatalogueActor,
  now = new Date(),
) {
  assertCataloguePermission(actor);
  const data = assignSchema.parse(input);
  assertPartnerCatalogueSourceSupported(data.sourceType);
  return prisma.$transaction(
    async (tx) => {
      const profile = await tx.partnerSalesProfile.findUnique({
        where: { partnershipId: data.partnershipId },
        select: { id: true, partnershipId: true, status: true },
      });
      if (!profile) {
        throw new PartnerCatalogueError("Partner sales profile not found.");
      }
      if (profile.status === "CLOSED") {
        throw new PartnerCatalogueError(
          "A closed partner sales profile cannot receive catalogue assignments.",
        );
      }
      const source = await resolveSource(tx, data.sourceType, data.sourceId, now);
      if (!source) {
        throw new PartnerCatalogueError(
          "The selected catalogue source is not currently sellable.",
        );
      }
      const existing = await tx.partnerCatalogueAssignment.findFirst({
        where: {
          profileId: profile.id,
          sourceId: data.sourceId,
          sourceType: data.sourceType === "COMBO" ? { in: ["COMBO", "CAMPAIGN"] } : data.sourceType,
        },
      });
      if (existing && existing.sourceType !== data.sourceType) {
        throw new PartnerCatalogueError(
          "This source is already assigned under its legacy campaign identity.",
        );
      }
      if (existing?.status === "ACTIVE") {
        throw new PartnerCatalogueError(
          "This source is already assigned to the partner catalogue.",
        );
      }
      const sourceSnapshot = source.sourceSnapshot ? JSON.parse(JSON.stringify(source.sourceSnapshot)) as Prisma.InputJsonValue : Prisma.DbNull;
      const values = {
        status: "ACTIVE" as const,
        visibleFrom: data.visibleFrom ?? null,
        visibleUntil: data.visibleUntil ?? null,
        presentationTitle: data.presentationTitle ?? null,
        presentationCopy: data.presentationCopy ?? null,
        mediaSnapshot: source.media,
        sourceSnapshot,
        availabilityFingerprint: source.fingerprint,
        approvedById: actor.user.id,
        approvedAt: now,
        withdrawnAt: null,
      };
      let assignment;
      if (existing) {
        const updated = await tx.partnerCatalogueAssignment.updateMany({
          where: { id: existing.id, status: "WITHDRAWN" },
          data: values,
        });
        if (updated.count !== 1) {
          throw new PartnerCatalogueError(
            "This assignment changed by another administrator. Reload and try again.",
          );
        }
        assignment = {
          ...existing,
          ...values,
        };
      } else {
        assignment = await tx.partnerCatalogueAssignment.create({
          data: {
            profileId: profile.id,
            sourceType: data.sourceType,
            sourceId: data.sourceId,
            ...values,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: actor.user.id,
          action: "partner-sales.catalogue.assign",
          entityType: "PartnerCatalogueAssignment",
          entityId: assignment.id,
          before: existing ? assignmentSnapshot(existing) : undefined,
          after: assignmentSnapshot(assignment),
        },
      });
      return assignment;
    },
    { isolationLevel: "Serializable" },
  );
}

export async function withdrawCatalogueItem(
  input: unknown,
  actor: PartnerCatalogueActor,
  now = new Date(),
) {
  assertCataloguePermission(actor);
  const data = withdrawSchema.parse(input);
  return prisma.$transaction(
    async (tx) => {
      const assignment = await tx.partnerCatalogueAssignment.findUnique({
        where: { id: data.assignmentId },
        include: { profile: { select: { partnershipId: true } } },
      });
      if (!assignment) {
        throw new PartnerCatalogueError("Catalogue assignment not found.");
      }
      if (assignment.profile.partnershipId !== data.partnershipId) {
        throw new PartnerCatalogueError(
          "This catalogue assignment does not belong to the selected partner.",
        );
      }
      if (assignment.status !== "ACTIVE") {
        throw new PartnerCatalogueError(
          "This catalogue assignment has already been withdrawn.",
        );
      }
      const updated = await tx.partnerCatalogueAssignment.updateMany({
        where: { id: assignment.id, status: "ACTIVE" },
        data: { status: "WITHDRAWN", withdrawnAt: now },
      });
      if (updated.count !== 1) {
        throw new PartnerCatalogueError(
          "This assignment changed by another administrator. Reload and try again.",
        );
      }
      const withdrawn = {
        ...assignment,
        status: "WITHDRAWN" as const,
        withdrawnAt: now,
        updatedAt: now,
      };
      await tx.auditLog.create({
        data: {
          actorId: actor.user.id,
          action: "partner-sales.catalogue.withdraw",
          entityType: "PartnerCatalogueAssignment",
          entityId: assignment.id,
          before: assignmentSnapshot(assignment),
          after: {
            ...assignmentSnapshot(withdrawn),
            reason: data.reason,
          },
        },
      });
      return withdrawn;
    },
    { isolationLevel: "Serializable" },
  );
}

/** Deliberate maintenance operation; never invoke from a public request path. */
export async function backfillLegacySupplierCatalogueMediaSnapshots() {
  return prisma.partnerCatalogueAssignment.updateMany({
    where: {
      sourceType: "SUPPLIER_CATALOGUE_PRODUCT",
      mediaSnapshot: { not: Prisma.DbNull },
    },
    data: { mediaSnapshot: Prisma.DbNull },
  });
}

function publicMedia(value: unknown) {
  return safeMediaSnapshot(value)[0] ?? null;
}

function activeAt(
  assignment: {
    status: string;
    visibleFrom: Date | null;
    visibleUntil: Date | null;
    approvedAt: Date | null;
    approvedById: string | null;
  },
  now: Date,
) {
  return Boolean(
    assignment.status === "ACTIVE" &&
      assignment.approvedAt &&
      assignment.approvedById &&
      (!assignment.visibleFrom || assignment.visibleFrom <= now) &&
      (!assignment.visibleUntil || assignment.visibleUntil > now),
  );
}

export async function partnerCatalogue(
  slug: string,
  now = new Date(),
): Promise<PublicPartnerCatalogueDto | null> {
  const settings = await partnerSalesSettings();
  if (!settings.enabled) return null;
  const profile = await prisma.partnerSalesProfile.findUnique({
    where: { publicSlug: slug },
    include: {
      logoDocument: {
        select: { bucket: true, path: true },
      },
      partnership: {
        select: {
          status: true,
          suspendedAt: true,
          terminatedAt: true,
          agreement: { select: { status: true, expiresAt: true } },
        },
      },
      catalogueAssignments: {
        where: {
          status: "ACTIVE",
          AND: [
            { OR: [{ visibleFrom: null }, { visibleFrom: { lte: now } }] },
            { OR: [{ visibleUntil: null }, { visibleUntil: { gt: now } }] },
          ],
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (
    !profile ||
    profile.status !== "ACTIVE" ||
    !profile.approvedAt ||
    !profile.approvedById ||
    !profile.publicCatalogueEnabled ||
    profile.suspendedAt ||
    profile.revokedAt ||
    profile.partnership.status !== "APPROVED" ||
    profile.partnership.suspendedAt ||
    profile.partnership.terminatedAt ||
    profile.partnership.agreement?.status !== "ACTIVE" ||
    (profile.partnership.agreement.expiresAt &&
      profile.partnership.agreement.expiresAt <= now)
  ) {
    return null;
  }

  const items: PublicPartnerCatalogueDto["items"] = [];
  for (const assignment of profile.catalogueAssignments) {
    if (!activeAt(assignment, now)) continue;
    // Legacy COMBO/CAMPAIGN rows remain in the database for history, but
    // cannot be resolved by the current public source contract. Filter them
    // before the resolver so a stale row cannot take the whole catalogue down.
    if (!isPartnerCatalogueSourceSupported(assignment.sourceType)) continue;
    const source = await resolveSource(
      prisma,
      assignment.sourceType,
      assignment.sourceId,
      now,
    );
    if (
      !source ||
      source.fingerprint !== assignment.availabilityFingerprint
    ) {
      continue;
    }
    items.push({
      assignmentId: assignment.id,
      title: assignment.presentationTitle ?? source.title,
      description: assignment.presentationCopy ?? source.description,
      sku: source.sku,
      image:
        assignment.sourceType === "SUPPLIER_CATALOGUE_PRODUCT"
          ? null
          : publicMedia(assignment.mediaSnapshot),
    });
  }

  const logoUrl = profile.logoDocument
    ? createSupabaseAdmin().storage
        .from(profile.logoDocument.bucket)
        .getPublicUrl(profile.logoDocument.path).data.publicUrl
    : null;
  return {
    profile: {
      publicSlug: profile.publicSlug,
      displayName: profile.displayName,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
      footerText: profile.footerText,
      themePreset: profile.themePreset,
      logoUrl,
    },
    items,
  };
}
