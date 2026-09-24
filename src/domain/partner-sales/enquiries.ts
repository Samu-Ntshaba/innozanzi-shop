import { createHash } from "node:crypto";
import { z } from "zod";
import { consumeRateLimit } from "@/domain/auth/rate-limit";
import { PartnerEnquiryError, resolveShowcaseRecord } from "@/domain/partner-sales/showcases";
import { stagePartnerSalesEvent } from "@/domain/partner-sales/communications";
import { prisma } from "@/lib/prisma";
import { partnerSalesSettings } from "@/domain/partner-sales/settings";
import { assertPartnerCatalogueSourceSupported } from "@/domain/partner-sales/catalogue-policy";

export {
  PartnerEnquiryError,
  PartnerShowcaseError,
} from "@/domain/partner-sales/showcases";

const plain = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !/[<>]|javascript:|data:text\/html|on\w+\s*=/i.test(value), "Use plain text only.");

const itemSchema = z.object({ itemId: z.string().uuid(), quantity: z.coerce.number().int().positive().max(10_000) }).strict();

const enquirySchema = z
  .object({
    publicId: z.string().trim().min(3).max(100),
    accessToken: z.string().trim().max(512).optional(),
    companyName: plain(160),
    contactName: plain(120),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z.string().trim().max(40).optional(),
    items: z.array(itemSchema).min(1).max(50),
    destination: plain(500),
    timing: plain(120),
    deliveryInstructions: z.string().trim().max(2000).refine((value) => !/[<>]|javascript:|data:text\/html|on\w+\s*=/i.test(value), "Use plain text only."),
    consent: z.literal(true, { error: "Communication consent is required." }),
    idempotencyKey: z.string().trim().min(8).max(128),
    rateLimitKey: z.string().trim().max(200).optional(),
  })
  .strict();

export type PartnerEnquiryInput = Omit<z.input<typeof enquirySchema>, "consent"> & {
  consent: boolean;
};

function stableRequestNumbers(publicId: string, idempotencyKey: string) {
  const digest = createHash("sha256").update(`${publicId}:${idempotencyKey}`).digest("hex").slice(0, 20).toUpperCase();
  return { requestNumber: `QR-PS-${digest}`, caseNumber: `PC-PS-${digest}` };
}

function safeSnapshot(item: {
  sourceType: string;
  sourceId: string;
  titleSnapshot: string;
  presentationCopySnapshot: string | null;
  availabilityFingerprint: string;
  sourceSnapshot?: unknown;
}) {
  return {
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    title: item.titleSnapshot,
    presentationCopy: item.presentationCopySnapshot,
    availabilityFingerprint: item.availabilityFingerprint,
    sourceSnapshot: item.sourceSnapshot ?? null,
  };
}

export async function createPartnerEnquiry(rawInput: unknown, now = new Date()) {
  let input: z.infer<typeof enquirySchema>;
  try {
    input = enquirySchema.parse(rawInput);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new PartnerEnquiryError(error.issues[0]?.message ?? "Please check the enquiry details.");
    }
    throw error;
  }
  if (!(await partnerSalesSettings()).enabled) throw new PartnerEnquiryError("Partner sales channel is currently unavailable.");
  const limit = await consumeRateLimit(
    `partner-enquiry:${input.rateLimitKey ?? "unknown"}:${input.publicId}`,
    5,
    60 * 60_000,
  );
  if (!limit.allowed) throw new PartnerEnquiryError(`Too many enquiries. Try again in ${limit.retryAfterSeconds} seconds.`);

  const numbers = stableRequestNumbers(input.publicId, input.idempotencyKey);
  const showcase = await resolveShowcaseRecord(input.publicId, input.accessToken, now);
  if (!showcase) throw new PartnerEnquiryError("This showcase is unavailable or has expired.");
  const itemById = new Map(showcase.items.map((item) => [item.id, item]));
  if (input.items.some((item) => !itemById.has(item.itemId))) {
    throw new PartnerEnquiryError("One or more selected items are no longer available in this showcase.");
  }
  for (const item of showcase.items) assertPartnerCatalogueSourceSupported(item.sourceType);

  return prisma.$transaction(async (tx) => {
    const existingRequest = await tx.quotationRequest.findUnique({ where: { requestNumber: numbers.requestNumber } });
    if (existingRequest) {
      const existingCase = await tx.partnerQuoteCase.findFirst({
        where: { quotationRequest: { id: existingRequest.id } },
        select: { caseNumber: true, partnerClientId: true },
      });
      if (existingCase) return { caseNumber: existingCase.caseNumber, requestNumber: numbers.requestNumber, clientId: existingCase.partnerClientId };
    }

    const partnershipId = showcase.profile.partnershipId;
    const profileId = showcase.profileId;
    const existingClient = await tx.partnerClient.findUnique({
      where: { partnershipId_email: { partnershipId, email: input.email } },
    });
    if (existingClient && existingClient.partnershipId !== partnershipId) {
      throw new PartnerEnquiryError("The client does not belong to this partnership.");
    }
    const client = existingClient
      ? await tx.partnerClient.update({
          where: { id: existingClient.id },
          data: {
            companyName: input.companyName,
            contactName: input.contactName,
            phone: input.phone ?? null,
            communicationConsent: true,
            consentAt: new Date(),
            deliveryAddress: { destination: input.destination, instructions: input.deliveryInstructions },
          },
        })
      : await tx.partnerClient.create({
          data: {
            partnershipId,
            companyName: input.companyName,
            contactName: input.contactName,
            email: input.email,
            phone: input.phone ?? null,
            communicationConsent: true,
            consentAt: new Date(),
            source: "PARTNER_SHOWCASE",
            deliveryAddress: { destination: input.destination, instructions: input.deliveryInstructions },
          },
        });

    const request = await tx.quotationRequest.create({
      data: {
        requestNumber: numbers.requestNumber,
        status: "OPEN",
        contactName: input.contactName,
        email: input.email,
        phone: input.phone ?? null,
        companyName: input.companyName,
        requirements: input.timing,
        customerNotes: input.deliveryInstructions,
        partnerSalesProfileId: profileId,
        items: {
          create: input.items.map((selected) => {
            const item = itemById.get(selected.itemId)!;
            return {
              productName: item.titleSnapshot,
              requestedQuantity: selected.quantity,
              productSnapshot: safeSnapshot(item),
            };
          }),
        },
      },
    });
    const quoteCase = await tx.partnerQuoteCase.create({
      data: {
        caseNumber: numbers.caseNumber,
        partnershipId,
        profileId,
        partnerClientId: client.id,
        originatingShowcaseId: showcase.id,
        status: "NEW_ENQUIRY",
        clientVisibleNotes: input.deliveryInstructions,
        deliveryInstructions: input.deliveryInstructions,
        clientSnapshot: {
          companyName: input.companyName,
          contactName: input.contactName,
          email: input.email,
          phone: input.phone ?? null,
          deliveryAddress: { destination: input.destination },
          deliveryInstructions: input.deliveryInstructions,
        },
      },
    });
    await tx.quotationRequest.update({
      where: { id: request.id },
      data: { partnerQuoteCaseId: quoteCase.id },
    });
    await tx.auditLog.create({
      data: {
        action: "partner-sales.enquiry.create",
        entityType: "PartnerQuoteCase",
        entityId: quoteCase.id,
        after: { caseNumber: numbers.caseNumber, requestNumber: numbers.requestNumber, partnershipId, itemCount: input.items.length },
      },
    });
    await stagePartnerSalesEvent(tx, {
      event: "ENQUIRY_RECEIVED",
      entityId: quoteCase.id,
      caseNumber: quoteCase.caseNumber,
      client: { email: client.email, name: client.contactName, company: client.companyName, communicationConsent: client.communicationConsent },
      partner: showcase.profile.contactEmail ? { email: showcase.profile.contactEmail, displayName: showcase.profile.displayName } : undefined,
      publicMessage: "Your quotation request has been received and is being reviewed.",
    });
    return { caseNumber: quoteCase.caseNumber, requestNumber: numbers.requestNumber, clientId: client.id };
  }, { isolationLevel: "Serializable" });
}
