import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { z } from "zod";
import type { PartnerSalesProfileStatus } from "@/generated/prisma/enums";
import {
  hasPermission,
  type PermissionGrant,
} from "@/domain/auth/permissions";
import { assertProfileTransition } from "@/domain/partner-sales/lifecycle";
import { partnerSalesSettings } from "@/domain/partner-sales/settings";
import { prisma } from "@/lib/prisma";
import { verifiedCatalogueImage } from "@/lib/security/catalogue-image";
import { createSupabaseAdmin } from "@/lib/supabase";

export const PARTNER_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const PARTNER_THEME_PRESETS = [
  "DEFAULT",
  "OCEAN",
  "FOREST",
  "GRAPHITE",
] as const;

export class PartnerSalesProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerSalesProfileError";
  }
}

const allowedLogoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const markupOrExecutableContent = /[<>]|javascript:|data:text\/html|on\w+\s*=/i;

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalPlainText = (max: number) =>
  optionalText(max).refine(
    (value) => !value || !markupOrExecutableContent.test(value),
    "Footer copy must be plain text without markup or executable content.",
  );

function normalizePublicSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const saveProfileSchema = z
  .object({
    partnershipId: z.string().uuid(),
    publicSlug: z
      .string()
      .trim()
      .transform(normalizePublicSlug)
      .pipe(
        z
          .string()
          .min(3, "Enter a public slug with at least 3 characters.")
          .max(80)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Enter a valid public slug."),
      ),
    displayName: z.string().trim().min(2).max(120),
    legalName: optionalText(200),
    registrationNumber: optionalText(100),
    vatNumber: optionalText(100),
    contactName: optionalText(120),
    contactEmail: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().trim().toLowerCase().email().max(254).optional(),
    ),
    contactPhone: optionalText(40),
    footerText: optionalPlainText(500),
    themePreset: z.enum(PARTNER_THEME_PRESETS),
    defaultCommissionMethod: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    defaultCommissionValue: z.coerce.number().finite().min(0).max(10_000_000),
    publicCatalogueEnabled: z.preprocess(
      (value) => value === true || value === "on" || value === "true",
      z.boolean(),
    ),
    logo: z.instanceof(File).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.defaultCommissionMethod === "PERCENTAGE" &&
      value.defaultCommissionValue > 100
    ) {
      context.addIssue({
        code: "custom",
        path: ["defaultCommissionValue"],
        message: "Percentage commission cannot exceed 100%.",
      });
    }
    if (
      value.logo &&
      (value.logo.size === 0 ||
        value.logo.size > PARTNER_LOGO_MAX_BYTES ||
        !allowedLogoTypes.has(value.logo.type))
    ) {
      context.addIssue({
        code: "custom",
        path: ["logo"],
        message: "Upload a valid JPG, PNG or WebP logo smaller than 2 MB.",
      });
    }
  });

const transitionSchema = z
  .object({
    partnershipId: z.string().uuid(),
    status: z.enum([
      "ADMIN_REVIEW",
      "ACTIVE",
      "CHANGES_REQUIRED",
      "SUSPENDED",
      "CLOSED",
    ]),
    reason: optionalPlainText(1000),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      ["CHANGES_REQUIRED", "SUSPENDED", "CLOSED"].includes(value.status) &&
      (!value.reason || value.reason.length < 5)
    ) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Enter a reason of at least 5 characters.",
      });
    }
  });

export type PartnerSalesProfileActor = {
  user: { id: string };
  grants: readonly PermissionGrant[];
  isSuperAdministrator: boolean;
};

export type SavePartnerSalesProfileInput = z.input<typeof saveProfileSchema>;
export type TransitionPartnerSalesProfileInput = z.input<
  typeof transitionSchema
>;

function assertProfilePermission(actor: PartnerSalesProfileActor) {
  if (
    !hasPermission(
      actor.grants,
      "partner_sales.profile.approve",
      actor.isSuperAdministrator,
    )
  ) {
    throw new PartnerSalesProfileError(
      "You do not have permission to manage partner sales profiles.",
    );
  }
}

function partnershipCanActivate(
  partnership: {
    status: string;
    suspendedAt: Date | null;
    terminatedAt: Date | null;
    agreement: { status: string; expiresAt: Date | null } | null;
  },
  now: Date,
) {
  return Boolean(
    partnership.status === "APPROVED" &&
      !partnership.suspendedAt &&
      !partnership.terminatedAt &&
      partnership.agreement?.status === "ACTIVE" &&
      (!partnership.agreement.expiresAt || partnership.agreement.expiresAt > now),
  );
}

function profileIsReady(profile: {
  displayName: string;
  publicSlug: string;
  logoDocumentId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}) {
  return Boolean(
    profile.displayName.trim() &&
      profile.publicSlug.trim() &&
      profile.logoDocumentId &&
      profile.contactName?.trim() &&
      profile.contactEmail?.trim() &&
      profile.contactPhone?.trim(),
  );
}

function profileSnapshot(profile: {
  publicSlug: string;
  status: PartnerSalesProfileStatus;
  displayName: string;
  legalName: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  logoDocumentId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  footerText: string | null;
  themePreset: string;
  defaultCommissionMethod: string;
  defaultCommissionValue: { toString(): string };
  publicCatalogueEnabled: boolean;
}) {
  return {
    publicSlug: profile.publicSlug,
    status: profile.status,
    displayName: profile.displayName,
    legalName: profile.legalName,
    registrationNumber: profile.registrationNumber,
    vatNumber: profile.vatNumber,
    logoDocumentId: profile.logoDocumentId,
    contactName: profile.contactName,
    contactEmail: profile.contactEmail,
    contactPhone: profile.contactPhone,
    footerText: profile.footerText,
    themePreset: profile.themePreset,
    defaultCommissionMethod: profile.defaultCommissionMethod,
    defaultCommissionValue: profile.defaultCommissionValue.toString(),
    publicCatalogueEnabled: profile.publicCatalogueEnabled,
  };
}

type PreparedLogo = {
  bucket: string;
  path: string;
  filename: string;
  bytes: Buffer;
};

async function prepareLogo(
  partnershipId: string,
  file: File | undefined,
): Promise<PreparedLogo | undefined> {
  if (!file) return undefined;
  let bytes: Buffer;
  try {
    bytes = await verifiedCatalogueImage(
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
  } catch {
    throw new PartnerSalesProfileError(
      "Upload a valid still JPG, PNG or WebP logo smaller than 2 MB.",
    );
  }
  if (!bytes.length || bytes.length > PARTNER_LOGO_MAX_BYTES) {
    throw new PartnerSalesProfileError(
      "The verified logo must be smaller than 2 MB.",
    );
  }

  const storage = createSupabaseAdmin();
  const bucket = process.env.SUPABASE_PUBLIC_BUCKET ?? "product-images";
  const existingBucket = await storage.storage.getBucket(bucket);
  if (!existingBucket.data) {
    const created = await storage.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: PARTNER_LOGO_MAX_BYTES,
    });
    if (created.error) throw created.error;
  }

  const baseName =
    file.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "partner-logo";
  const filename = `${baseName}.webp`;
  const path = `partner-sales/${partnershipId}/logo/${randomUUID()}-${filename}`;
  const result = await storage.storage.from(bucket).upload(path, bytes, {
    contentType: "image/webp",
    upsert: false,
  });
  if (result.error) throw result.error;
  return { bucket, path, filename, bytes };
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002",
  );
}

export async function savePartnerSalesProfile(
  input: unknown,
  actor: PartnerSalesProfileActor,
) {
  assertProfilePermission(actor);
  const data = saveProfileSchema.parse(input);
  const [partnership, existing, collision] = await Promise.all([
    prisma.partnership.findUnique({
      where: { id: data.partnershipId },
      select: { id: true },
    }),
    prisma.partnerSalesProfile.findUnique({
      where: { partnershipId: data.partnershipId },
    }),
    prisma.partnerSalesProfile.findFirst({
      where: {
        publicSlug: data.publicSlug,
        partnershipId: { not: data.partnershipId },
      },
      select: { id: true },
    }),
  ]);
  if (!partnership) throw new PartnerSalesProfileError("Partnership not found.");
  if (collision) {
    throw new PartnerSalesProfileError("This public slug is already in use.");
  }
  if (existing && ["ACTIVE", "SUSPENDED", "CLOSED"].includes(existing.status)) {
    throw new PartnerSalesProfileError(
      "Suspend or close the active profile before changing approved branding.",
    );
  }

  const preparedLogo = await prepareLogo(data.partnershipId, data.logo);
  const storage = preparedLogo ? createSupabaseAdmin() : null;
  try {
    return await prisma.$transaction(async (tx) => {
      let logoDocumentId = existing?.logoDocumentId ?? null;
      if (preparedLogo) {
        const document = await tx.uploadedDocument.create({
          data: {
            bucket: preparedLogo.bucket,
            path: preparedLogo.path,
            originalName: preparedLogo.filename,
            mimeType: "image/webp",
            size: preparedLogo.bytes.length,
            isPrivate: false,
          },
        });
        logoDocumentId = document.id;
      }

      const values = {
        publicSlug: data.publicSlug,
        displayName: data.displayName,
        legalName: data.legalName ?? null,
        registrationNumber: data.registrationNumber ?? null,
        vatNumber: data.vatNumber ?? null,
        logoDocumentId,
        contactName: data.contactName ?? null,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
        footerText: data.footerText ?? null,
        themePreset: data.themePreset,
        defaultCommissionMethod: data.defaultCommissionMethod,
        defaultCommissionValue: new Decimal(data.defaultCommissionValue),
        publicCatalogueEnabled: data.publicCatalogueEnabled,
      };
      const saved = existing
        ? await tx.partnerSalesProfile.update({
            where: { id: existing.id },
            data: {
              ...values,
              status:
                existing.status === "CHANGES_REQUIRED"
                  ? "PROFILE_INCOMPLETE"
                  : existing.status,
            },
          })
        : await tx.partnerSalesProfile.create({
            data: {
              partnershipId: data.partnershipId,
              ...values,
              status: "PROFILE_INCOMPLETE",
            },
          });
      await tx.auditLog.create({
        data: {
          actorId: actor.user.id,
          action: "partner-sales.profile.save",
          entityType: "PartnerSalesProfile",
          entityId: saved.id,
          before: existing ? profileSnapshot(existing) : undefined,
          after: profileSnapshot(saved),
        },
      });
      return saved;
    });
  } catch (error) {
    if (preparedLogo && storage) {
      await storage.storage
        .from(preparedLogo.bucket)
        .remove([preparedLogo.path]);
    }
    if (isUniqueConstraintError(error)) {
      throw new PartnerSalesProfileError("This public slug is already in use.");
    }
    throw error;
  }
}

export async function transitionPartnerSalesProfile(
  input: unknown,
  actor: PartnerSalesProfileActor,
) {
  assertProfilePermission(actor);
  const data = transitionSchema.parse(input);
  const settings =
    data.status === "ACTIVE" ? await partnerSalesSettings() : undefined;
  if (data.status === "ACTIVE" && !settings?.enabled) {
    throw new PartnerSalesProfileError(
      "Enable the partner sales channel before activating profiles.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const [partnership, profile] = await Promise.all([
      tx.partnership.findUnique({
        where: { id: data.partnershipId },
        select: {
          id: true,
          userId: true,
          status: true,
          suspendedAt: true,
          terminatedAt: true,
          agreement: { select: { status: true, expiresAt: true } },
        },
      }),
      tx.partnerSalesProfile.findUnique({
        where: { partnershipId: data.partnershipId },
      }),
    ]);
    if (!partnership || !profile) {
      throw new PartnerSalesProfileError("Partner sales profile not found.");
    }
    if (data.status === "ACTIVE") {
      if (partnership.userId === actor.user.id) {
        throw new PartnerSalesProfileError(
          "A partner cannot approve their own sales profile.",
        );
      }
      if (!partnershipCanActivate(partnership, new Date())) {
        throw new PartnerSalesProfileError(
          "Profile activation requires an active partnership and active agreement.",
        );
      }
      if (!profileIsReady(profile)) {
        throw new PartnerSalesProfileError(
          "Complete the display name, slug, logo and contact details before activation.",
        );
      }
      const lastSave = await tx.auditLog.findFirst({
        where: {
          entityType: "PartnerSalesProfile",
          entityId: profile.id,
          action: "partner-sales.profile.save",
        },
        orderBy: { createdAt: "desc" },
        select: { actorId: true },
      });
      if (lastSave?.actorId === actor.user.id) {
        throw new PartnerSalesProfileError(
          "An Admin cannot approve their own profile changes.",
        );
      }
    }
    if (data.status === "ADMIN_REVIEW" && !profileIsReady(profile)) {
      throw new PartnerSalesProfileError(
        "Complete the display name, slug, logo and contact details before review.",
      );
    }

    try {
      assertProfileTransition(profile.status, data.status);
    } catch (error) {
      throw new PartnerSalesProfileError(
        error instanceof Error
          ? error.message
          : "This profile lifecycle transition is not allowed.",
      );
    }
    const now = new Date();
    const lifecycleData =
      data.status === "ACTIVE"
        ? {
            status: data.status,
            approvedAt: now,
            approvedById: actor.user.id,
            suspendedAt: null,
            revokedAt: null,
          }
        : data.status === "SUSPENDED"
          ? {
              status: data.status,
              publicCatalogueEnabled: false,
              suspendedAt: now,
            }
          : data.status === "CLOSED"
            ? {
                status: data.status,
                publicCatalogueEnabled: false,
                revokedAt: now,
              }
            : data.status === "CHANGES_REQUIRED"
              ? {
                  status: data.status,
                  publicCatalogueEnabled: false,
                  approvedAt: null,
                  approvedById: null,
                }
              : { status: data.status, publicCatalogueEnabled: false };
    const saved = await tx.partnerSalesProfile.update({
      where: { id: profile.id },
      data: lifecycleData,
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.user.id,
        action: `partner-sales.profile.${data.status.toLowerCase()}`,
        entityType: "PartnerSalesProfile",
        entityId: profile.id,
        before: { status: profile.status },
        after: { status: data.status, reason: data.reason },
      },
    });
    return saved;
  });
}
