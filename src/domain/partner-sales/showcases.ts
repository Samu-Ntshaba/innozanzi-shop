import { randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  publicPartnerProfileDto,
  publicShowcaseDto,
  type PublicShowcaseDto,
} from "@/domain/partner-sales/redaction";
import { createPublicToken, hashPublicToken } from "@/domain/partner-sales/tokens";
import { partnerSalesSettings } from "@/domain/partner-sales/settings";
import { assertPartnerCatalogueSourceSupported } from "@/domain/partner-sales/catalogue-policy";
import { prisma } from "@/lib/prisma";

const showcaseText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) => !/[<>]|javascript:|data:text\/html|on\w+\s*=/i.test(value),
      "Showcase copy must be plain text.",
    );

const optionalShowcaseText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    showcaseText(max).optional(),
  );

const showcaseInputSchema = z
  .object({
    partnershipId: z.string().uuid(),
    profileId: z.string().uuid(),
    title: showcaseText(180),
    introduction: optionalShowcaseText(1200),
    visibility: z.enum(["PUBLIC", "CLIENT_SPECIFIC"]),
    clientId: z.string().uuid().optional(),
    assignmentIds: z.array(z.string().uuid()).min(1).max(100),
    expiresAt: z.coerce.date().optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.visibility === "CLIENT_SPECIFIC" && !input.clientId) {
      context.addIssue({
        code: "custom",
        path: ["clientId"],
        message: "A client-specific showcase requires a client.",
      });
    }
    if (input.visibility === "PUBLIC" && input.clientId) {
      context.addIssue({
        code: "custom",
        path: ["clientId"],
        message: "Public showcases cannot be tied to a private client.",
      });
    }
    if (input.expiresAt && input.expiresAt <= new Date()) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "The showcase expiry must be in the future.",
      });
    }
  });

export type PartnerShowcaseActor = {
  user: { id: string };
  partnershipId?: string;
};

export type CreateShowcaseInput = z.input<typeof showcaseInputSchema>;

export class PartnerEnquiryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerEnquiryError";
  }
}

export { PartnerEnquiryError as PartnerShowcaseError };

function assertActorOwnsPartnership(actor: PartnerShowcaseActor, partnershipId: string) {
  if (actor.partnershipId && actor.partnershipId !== partnershipId) {
    throw new PartnerEnquiryError("This showcase belongs to another partnership.");
  }
}

function tokenMatches(storedHash: string | null, plainToken: string | undefined) {
  if (!storedHash || !plainToken || !/^[a-f0-9]{64}$/i.test(storedHash)) return false;
  const candidate = Buffer.from(hashPublicToken(plainToken), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function activeProfile(profile: {
  status?: string;
  approvedAt?: Date | null;
  approvedById?: string | null;
  publicCatalogueEnabled?: boolean;
  suspendedAt?: Date | null;
  revokedAt?: Date | null;
  partnership?: {
    status?: string;
    suspendedAt?: Date | null;
    terminatedAt?: Date | null;
    agreement?: { status?: string; expiresAt?: Date | null } | null;
  } | null;
}, now = new Date()) {
  return Boolean(
    profile.status === "ACTIVE" &&
      profile.approvedAt &&
      profile.approvedById &&
      profile.publicCatalogueEnabled &&
      !profile.suspendedAt &&
      !profile.revokedAt &&
      profile.partnership?.status === "APPROVED" &&
      !profile.partnership.suspendedAt &&
      !profile.partnership.terminatedAt &&
      profile.partnership.agreement?.status === "ACTIVE" &&
      (!profile.partnership.agreement.expiresAt || profile.partnership.agreement.expiresAt > now),
  );
}

function showcaseAvailable(showcase: {
  status?: string;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
}, now = new Date()) {
  return Boolean(
    showcase.status === "ACTIVE" &&
      !showcase.revokedAt &&
      (!showcase.expiresAt || showcase.expiresAt > now),
  );
}

async function loadShowcase(publicId: string, accessToken?: string, now = new Date()) {
  if (!(await partnerSalesSettings()).enabled) return null;
  const showcase = await prisma.partnerShowcase.findUnique({
    where: { publicId },
    include: {
      profile: { include: { partnership: { include: { agreement: true } } } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!showcase || !showcaseAvailable(showcase, now) || !activeProfile(showcase.profile, now)) return null;
  if (showcase.items.some((item) => {
    try {
      assertPartnerCatalogueSourceSupported(item.sourceType);
      return false;
    } catch {
      return true;
    }
  })) return null;
  if (showcase.visibility === "CLIENT_SPECIFIC" && !tokenMatches(showcase.accessTokenHash, accessToken)) return null;
  if (showcase.visibility === "PUBLIC" && accessToken && !tokenMatches(showcase.accessTokenHash, accessToken)) return null;
  return showcase;
}

export async function createShowcase(
  rawInput: unknown,
  actor: PartnerShowcaseActor,
  now = new Date(),
) {
  const input = showcaseInputSchema.parse(rawInput);
  assertActorOwnsPartnership(actor, input.partnershipId);
  if (input.visibility === "CLIENT_SPECIFIC" && !input.clientId) {
    throw new PartnerEnquiryError("A client-specific showcase requires a client.");
  }

  return prisma.$transaction(async (tx) => {
    const profile = await tx.partnerSalesProfile.findUnique({
      where: { id: input.profileId },
      include: { partnership: { include: { agreement: true } } },
    });
    if (!profile || profile.partnershipId !== input.partnershipId || !activeProfile(profile, now)) {
      throw new PartnerEnquiryError("This sales profile is not available for showcase publishing.");
    }

    if (input.visibility === "CLIENT_SPECIFIC") {
      const client = await tx.partnerClient.findUnique({
        where: { id: input.clientId },
        select: { id: true, partnershipId: true },
      });
      if (!client || client.partnershipId !== input.partnershipId) {
        throw new PartnerEnquiryError("The selected client does not belong to this partnership.");
      }
    }

    const assignments = await tx.partnerCatalogueAssignment.findMany({
      where: {
        id: { in: input.assignmentIds },
        profileId: input.profileId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "asc" },
    });
    if (
      assignments.length !== input.assignmentIds.length ||
      assignments.some(
        (assignment) =>
          assignment.status !== "ACTIVE" ||
          (assignment.visibleFrom && assignment.visibleFrom > now) ||
          (assignment.visibleUntil && assignment.visibleUntil <= now) ||
          ("approvedAt" in assignment && !assignment.approvedAt) ||
          ("approvedById" in assignment && !assignment.approvedById),
      )
    ) {
      throw new PartnerEnquiryError("One or more catalogue items are withdrawn or no longer eligible.");
    }
    for (const assignment of assignments) assertPartnerCatalogueSourceSupported(assignment.sourceType);

    const token = input.visibility === "CLIENT_SPECIFIC" ? createPublicToken() : undefined;
    const publicId = `showcase-${randomUUID().replaceAll("-", "").slice(0, 24)}`;
    const created = await tx.partnerShowcase.create({
      data: {
        publicId,
        profileId: input.profileId,
        clientId: input.clientId ?? null,
        createdById: actor.user.id,
        title: input.title,
        introduction: input.introduction ?? null,
        visibility: input.visibility,
        status: "DRAFT",
        accessTokenHash: token?.hash ?? null,
        expiresAt: input.expiresAt ?? null,
      },
    });
    await tx.partnerShowcaseItem.createMany({
      data: assignments.map((assignment, index) => ({
        showcaseId: created.id,
        catalogueAssignmentId: assignment.id,
        sortOrder: index,
        sourceType: assignment.sourceType,
        sourceId: assignment.sourceId,
        titleSnapshot: assignment.presentationTitle ?? `Catalogue item ${index + 1}`,
        mediaSnapshot: assignment.mediaSnapshot ?? undefined,
        presentationCopySnapshot: assignment.presentationCopy ?? null,
        availabilityFingerprint: assignment.availabilityFingerprint,
        sourceSnapshot: assignment.sourceSnapshot ?? undefined,
      })),
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.user.id,
        action: "partner-sales.showcase.create",
        entityType: "PartnerShowcase",
        entityId: created.id,
        after: { publicId, profileId: input.profileId, visibility: input.visibility, itemCount: assignments.length },
      },
    });
    return { showcaseId: created.id, publicId, accessToken: token?.plain };
  });
}

export async function activateShowcase(showcaseId: string, actor: PartnerShowcaseActor, now = new Date()) {
  const existing = await prisma.partnerShowcase.findUnique({
    where: { id: showcaseId },
    include: { profile: { include: { partnership: { include: { agreement: true } } } } },
  });
  if (!existing || (actor.partnershipId && existing.profile.partnershipId !== actor.partnershipId)) {
    throw new PartnerEnquiryError("Showcase not found.");
  }
  if (!activeProfile(existing.profile, now) || existing.status === "REVOKED" || (existing.expiresAt && existing.expiresAt <= now)) {
    throw new PartnerEnquiryError("This showcase cannot be activated.");
  }
  const updated = await prisma.partnerShowcase.update({
    where: { id: showcaseId },
    data: { status: "ACTIVE", activatedAt: new Date() },
  });
  return { showcaseId: updated.id, publicId: updated.publicId, accessToken: undefined };
}

export async function revokeShowcase(
  showcaseId: string,
  actor: PartnerShowcaseActor,
  reason = "Partner revoked showcase",
) {
  const existing = await prisma.partnerShowcase.findUnique({
    where: { id: showcaseId },
    include: { profile: { select: { partnershipId: true } } },
  });
  if (!existing || (actor.partnershipId && existing.profile.partnershipId !== actor.partnershipId)) {
    throw new PartnerEnquiryError("Showcase not found.");
  }
  const cleanReason = z.string().trim().min(5).max(500).parse(reason);
  await prisma.partnerShowcase.update({
    where: { id: showcaseId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.user.id,
      action: "partner-sales.showcase.revoke",
      entityType: "PartnerShowcase",
      entityId: showcaseId,
      after: { reason: cleanReason.slice(0, 500) },
    },
  });
}

export async function resolveShowcase(
  publicId: string,
  accessToken?: string,
  now = new Date(),
): Promise<(PublicShowcaseDto & { profile: ReturnType<typeof publicPartnerProfileDto> }) | null> {
  const showcase = await loadShowcase(publicId, accessToken, now);
  if (!showcase) return null;
  return {
    ...publicShowcaseDto(showcase),
    profile: publicPartnerProfileDto(showcase.profile),
  };
}

export async function resolveShowcaseRecord(publicId: string, accessToken?: string, now = new Date()) {
  return loadShowcase(publicId, accessToken, now);
}
