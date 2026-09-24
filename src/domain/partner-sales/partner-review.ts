import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enqueueEmail } from "@/integrations/email/outbox";
import { publicSiteUrl } from "@/lib/public-site-url";
import {
  clientQuotationEmailHtml,
  clientQuotationProjection,
  createPartnerQuotationToken,
  renderPartnerQuotationPdf,
  verifyPartnerQuotationToken,
  type PartnerQuotationClientProjection,
} from "./documents";
import { stagePartnerSalesEvent } from "./communications";
import { partnerSalesSettings } from "./settings";

export type PartnerReviewActor = { user: { id: string }; partnershipId?: string };

export class PartnerQuotationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerQuotationError";
  }
}

const noteSchema = z.string().trim().min(3).max(2000).refine((value) => !/[<>]|javascript:|data:text\/html|on\w+\s*=/i.test(value), "Use plain text only.");
const acceptanceSchema = z.object({
  consent: z.literal(true, { error: "Acceptance consent is required." }),
  metadata: z.object({
    userAgent: z.string().trim().max(512).optional(),
    forwardedFor: z.string().trim().max(128).optional(),
    referrer: z.string().trim().max(1000).optional(),
  }).strict().optional(),
}).strict();

function stringValue(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

function dateValue(value: unknown) {
  return value instanceof Date ? value : new Date(stringValue(value));
}

function ownsCase(quoteCase: { partnershipId?: string }, actor: PartnerReviewActor) {
  if (actor.partnershipId && quoteCase.partnershipId !== actor.partnershipId) {
    throw new PartnerQuotationError("This quotation belongs to another partnership.");
  }
}

async function lockCase(db: unknown, caseId: string) {
  const candidate = db as { $queryRawUnsafe?: (query: string, ...values: unknown[]) => Promise<unknown> };
  if (typeof candidate.$queryRawUnsafe === "function") {
    await candidate.$queryRawUnsafe('SELECT id FROM "PartnerQuoteCase" WHERE id = $1 FOR UPDATE', caseId);
  }
}

async function loadReviewCase(caseId: string) {
  const row = await prisma.partnerQuoteCase.findUnique({
    where: { id: caseId },
    include: {
      partnerClient: { select: { companyName: true, contactName: true, email: true } },
      profile: { select: { displayName: true, publicSlug: true, themePreset: true, contactEmail: true } },
      activeQuotation: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
    },
  });
  if (!row) throw new PartnerQuotationError("Partner quotation case not found.");
  return row;
}

function versionForQuotation(row: Record<string, unknown>) {
  const quotation = row.activeQuotation && typeof row.activeQuotation === "object" ? row.activeQuotation as Record<string, unknown> : {};
  const versions = Array.isArray(quotation.versions) ? quotation.versions : [];
  const version = versions[0] && typeof versions[0] === "object" ? versions[0] as Record<string, unknown> : null;
  if (!version || typeof version.id !== "string") throw new PartnerQuotationError("The approved quotation has no immutable version.");
  return { quotation, version };
}

function sentResult(input: unknown, versionId: string, accessToken: string) {
  const projection = clientQuotationProjection(input);
  return {
    ...projection,
    versionId,
    accessToken,
    link: new URL(`/partner-quote/${encodeURIComponent(accessToken)}`, publicSiteUrl()).toString(),
  };
}

export async function requestPartnerRevision(caseId: string, actor: PartnerReviewActor, rawNote: unknown) {
  let note: string;
  try { note = noteSchema.parse(rawNote); } catch { throw new PartnerQuotationError("Revision comments must be plain text between 3 and 2,000 characters."); }
  const existing = await loadReviewCase(caseId);
  ownsCase(existing, actor);
  if (existing.status === "REVISION_REQUESTED") return { caseId, status: existing.status, note: existing.partnerNotes ?? note };
  if (existing.status !== "PARTNER_REVIEW") throw new PartnerQuotationError("Only a quotation under partner review can request a revision.");
  const result = await prisma.$transaction(async (tx) => {
    await lockCase(tx, caseId);
    const current = await tx.partnerQuoteCase.findUnique({ where: { id: caseId } });
    if (!current) throw new PartnerQuotationError("Partner quotation case not found.");
    ownsCase(current, actor);
    if (current.status === "REVISION_REQUESTED") return current;
    if (current.status !== "PARTNER_REVIEW") throw new PartnerQuotationError("This quotation review has already changed.");
    const updated = await tx.partnerQuoteCase.update({ where: { id: caseId }, data: { status: "REVISION_REQUESTED", partnerNotes: note } });
    await tx.auditLog.create({ data: { actorId: actor.user.id, action: "partner-sales.quotation.revision-request", entityType: "PartnerQuoteCase", entityId: caseId, before: { status: current.status }, after: { status: "REVISION_REQUESTED", note } } });
    await stagePartnerSalesEvent(tx, {
      event: "REVISION_REQUESTED",
      entityId: caseId,
      caseNumber: current.caseNumber,
      partner: existing.profile?.contactEmail ? { email: existing.profile.contactEmail, displayName: existing.profile.displayName } : undefined,
      internalMessage: note,
    });
    return updated;
  });
  revalidatePath(`/account/partner/sales/${caseId}`);
  return { caseId, status: "REVISION_REQUESTED", note: result.partnerNotes ?? note };
}

export async function sendPartnerQuotation(caseId: string, actor: PartnerReviewActor, now = new Date()) {
  if (!(await partnerSalesSettings()).enabled) throw new PartnerQuotationError("Partner sales channel is currently unavailable.");
  const existing = await loadReviewCase(caseId);
  ownsCase(existing, actor);
  if (!["PARTNER_REVIEW", "SENT_TO_CLIENT"].includes(existing.status)) throw new PartnerQuotationError("Only a quotation under partner review can be sent.");
  const before = existing as unknown as Record<string, unknown>;
  const { quotation, version } = versionForQuotation(before);
  const validUntil = dateValue(quotation.validUntil);
  if (!Number.isFinite(validUntil.getTime()) || validUntil <= now) throw new PartnerQuotationError("This quotation has expired and must be repriced.");
  const projection = clientQuotationProjection({ ...before, snapshot: version.snapshot, version, quotation: { ...quotation, partnerQuoteCase: before } });
  const accessToken = createPartnerQuotationToken(String(version.id), validUntil);

  await prisma.$transaction(async (tx) => {
    await lockCase(tx, caseId);
    const current = await tx.partnerQuoteCase.findUnique({ where: { id: caseId }, include: { activeQuotation: true, profile: { select: { displayName: true, contactEmail: true } } } });
    if (!current) throw new PartnerQuotationError("Partner quotation case not found.");
    ownsCase(current, actor);
    if (current.status === "SENT_TO_CLIENT") return current;
    if (current.status !== "PARTNER_REVIEW") throw new PartnerQuotationError("This quotation review has already changed.");
    await tx.quotation.update({ where: { id: String(current.activeQuotationId) }, data: { status: "SENT", issuedAt: now } });
    await tx.partnerQuoteCase.update({ where: { id: caseId }, data: { status: "SENT_TO_CLIENT", sentAt: now } });
    await tx.quotationStatusHistory.create({ data: { quotationId: String(current.activeQuotationId), fromStatus: "FINAL_APPROVED", toStatus: "SENT", actorId: actor.user.id, note: `Partner sent immutable quotation version ${String(version.version)} to the client.` } });
    await tx.auditLog.create({ data: { actorId: actor.user.id, action: "partner-sales.quotation.send", entityType: "Quotation", entityId: String(current.activeQuotationId), after: { caseId, quotationVersionId: String(version.id), version: Number(version.version ?? 1) } } });
    await stagePartnerSalesEvent(tx, {
      event: "QUOTATION_SENT",
      entityId: caseId,
      caseNumber: current.caseNumber,
      quoteNumber: stringValue(quotation.quotationNumber, "Quotation"),
      partner: current.profile?.contactEmail ? { email: current.profile.contactEmail, displayName: current.profile.displayName } : undefined,
      internalMessage: "The approved quotation was sent to the client.",
    });
  });

  const link = new URL(`/partner-quote/${encodeURIComponent(accessToken)}`, publicSiteUrl()).toString();
  const pdf = renderPartnerQuotationPdf({ quotationNumber: stringValue(quotation.quotationNumber, "Quotation"), version: Number(version.version ?? 1), partner: projection.partner, client: projection.client, snapshot: projection.snapshot, terms: projection.terms, validUntil });
  const email = {
    to: projection.client.email,
    subject: `Quotation ${projection.quotationNumber} from Innozanzi`,
    text: `Please review quotation ${projection.quotationNumber} issued by Innozanzi on behalf of ${projection.partner.displayName}. Total: R ${projection.snapshot.grandTotal}. ${link}`,
    html: clientQuotationEmailHtml(projection, link),
    idempotencyKey: `partner-sales:QUOTATION_SENT:${caseId}:client`,
    attachments: [{ filename: `Quotation-${projection.quotationNumber}.pdf`, content: pdf, contentType: "application/pdf" }],
  };
  let emailQueued = false;
  try { await enqueueEmail(email, undefined); emailQueued = true; } catch (error) { console.error("Partner quotation email queued for retry", error); }
  revalidatePath(`/account/partner/sales/${caseId}`);
  return { ...sentResult({ ...before, snapshot: version.snapshot, version, quotation: { ...quotation, partnerQuoteCase: before } }, String(version.id), accessToken), emailQueued };
}

export async function resolveClientQuotation(token: string, now = new Date()): Promise<PartnerQuotationClientProjection & { versionId: string } | null> {
  if (!(await partnerSalesSettings()).enabled) return null;
  const verified = verifyPartnerQuotationToken(token, now);
  if (!verified) return null;
  const row = await prisma.quotationVersion.findUnique({
    where: { id: verified.versionId },
    include: {
      quotation: { include: { partnerSalesProfile: true, partnerQuoteCase: { include: { partnerClient: true } } } },
    },
  });
  if (!row) return null;
  const quote = row.quotation;
  if (!quote || !["SENT", "ACCEPTED"].includes(quote.status) || dateValue(quote.validUntil) <= now) return null;
  const quoteCase = quote.partnerQuoteCase;
  if (!quoteCase || !["SENT_TO_CLIENT", "ACCEPTED", "PAYMENT_PENDING"].includes(quoteCase.status)) return null;
  if (quoteCase.activeQuotationId !== quote.id || Number(quote.version) !== Number(row.version)) return null;
  return { ...clientQuotationProjection(row), versionId: row.id };
}

function acceptedResult(row: Record<string, unknown>, versionId: string) {
  const quote = row.quotation && typeof row.quotation === "object" ? row.quotation as Record<string, unknown> : row;
  return { acceptanceId: versionId, quotationId: stringValue(quote.id), version: Number(row.version ?? quote.version ?? 1), amount: stringValue(String(quote.grandTotal ?? "0.00")), status: "PAYMENT_PENDING" as const };
}

export async function acceptPartnerQuotation(token: string, rawInput: unknown, now = new Date()) {
  if (!(await partnerSalesSettings()).enabled) throw new PartnerQuotationError("Partner sales channel is currently unavailable.");
  const input = acceptanceSchema.safeParse(rawInput);
  if (!input.success) throw new PartnerQuotationError(input.error.issues[0]?.message ?? "Acceptance consent is required.");
  const verified = verifyPartnerQuotationToken(token, now);
  if (!verified) throw new PartnerQuotationError("This quotation link is invalid or has expired.");
  const result = await prisma.$transaction(async (tx) => {
    let row = await tx.quotationVersion.findUnique({ where: { id: verified.versionId }, include: { quotation: { include: { partnerQuoteCase: { include: { partnerClient: true } } } } } });
    if (!row || !row.quotation || !row.quotation.partnerQuoteCase) throw new PartnerQuotationError("This quotation is no longer available.");
    await lockCase(tx, row.quotation.partnerQuoteCase.id);
    // The row lock makes the second concurrent attempt re-read the accepted state
    // before it decides whether it needs to write an acceptance.
    const transactionClient = tx as unknown as { $queryRawUnsafe?: unknown };
    if (typeof transactionClient.$queryRawUnsafe === "function") {
      row = await tx.quotationVersion.findUnique({ where: { id: verified.versionId }, include: { quotation: { include: { partnerQuoteCase: { include: { partnerClient: true } } } } } });
      if (!row || !row.quotation || !row.quotation.partnerQuoteCase) throw new PartnerQuotationError("This quotation is no longer available.");
    }
    const quote = row.quotation;
    const quoteCase = quote.partnerQuoteCase;
    if (!quoteCase) throw new PartnerQuotationError("This quotation is no longer available.");
    if (quoteCase.acceptedQuotationVersionId === row.id || ["ACCEPTED", "PAYMENT_PENDING", "PAID", "ORDER_IN_PROGRESS", "COMPLETED"].includes(quoteCase.status)) return acceptedResult(row, row.id);
    if (quote.status !== "SENT" || quoteCase.status !== "SENT_TO_CLIENT" || quoteCase.activeQuotationId !== quote.id || Number(row.version) !== Number(quote.version)) throw new PartnerQuotationError("Only the latest approved quotation version can be accepted.");
    if (dateValue(quote.validUntil) <= now) throw new PartnerQuotationError("This quotation has expired and must be repriced.");
    const metadata = { acceptedAt: now.toISOString(), version: row.version, amount: String(quote.grandTotal), ...(input.data.metadata ?? {}) };
    await tx.quotation.update({ where: { id: quote.id }, data: { status: "ACCEPTED", acceptedAt: now, acceptedVersion: row.version, acceptedAmount: quote.grandTotal, acceptanceMetadata: metadata } });
    await tx.partnerQuoteCase.update({ where: { id: quoteCase.id }, data: { status: "PAYMENT_PENDING", acceptedQuotationId: quote.id, acceptedQuotationVersionId: row.id, acceptedAt: now } });
    await tx.quotationStatusHistory.create({ data: { quotationId: quote.id, fromStatus: "SENT", toStatus: "ACCEPTED", note: `Client accepted immutable quotation version ${row.version}.` } });
    await tx.auditLog.create({ data: { action: "partner-sales.quotation.accept", entityType: "Quotation", entityId: quote.id, after: { quotationVersionId: row.id, version: row.version, amount: String(quote.grandTotal), consent: true } } });
    await stagePartnerSalesEvent(tx, {
      event: "QUOTATION_ACCEPTED",
      entityId: quoteCase.id,
      caseNumber: quoteCase.caseNumber,
      quoteNumber: quote.quotationNumber,
      total: String(quote.grandTotal),
      client: { email: quoteCase.partnerClient?.email ?? "", name: quoteCase.partnerClient?.contactName, company: quoteCase.partnerClient?.companyName, communicationConsent: quoteCase.partnerClient?.communicationConsent },
      internalMessage: "Client acceptance consent and immutable quotation version were recorded.",
    });
    return acceptedResult(row, row.id);
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/partner-quote/${encodeURIComponent(token)}`);
  return result;
}
