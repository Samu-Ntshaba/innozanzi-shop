import { redirect } from "next/navigation";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { partnerSalesSettings } from "./settings";

type PartnerSalesMembership = Awaited<ReturnType<typeof membershipsForUser>>[number];

async function membershipsForUser(userId: string) {
  return prisma.partnership.findMany({
    where: { userId },
    select: {
      id: true,
      partnerNumber: true,
      status: true,
      suspendedAt: true,
      terminatedAt: true,
      agreement: {
        select: {
          status: true,
          expiresAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

function isActiveAuthorizedPartnership(
  partnership: PartnerSalesMembership,
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

export async function requirePartnerSalesContext(
  requestedPartnershipId?: string,
) {
  const context = await requireUser();
  const settings = await partnerSalesSettings();
  if (!settings.enabled) redirect("/unauthorized");

  const memberships = await membershipsForUser(context.user.id);
  const partnership = requestedPartnershipId
    ? memberships.find((membership) => membership.id === requestedPartnershipId)
    : memberships.length === 1
      ? memberships[0]
      : undefined;

  if (!partnership || !isActiveAuthorizedPartnership(partnership, new Date())) {
    redirect("/unauthorized");
  }

  return { context, partnership };
}
