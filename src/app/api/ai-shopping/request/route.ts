import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/domain/auth/session";
import { consumeRateLimit } from "@/domain/auth/rate-limit";
import { productRequestSchema, escapeEmailHtml } from "@/domain/ai-shopping/request-schema";
import { boundedJson, browserMutationGuard, clientAddress } from "@/lib/security/request";
import { enqueueEmail } from "@/integrations/email/outbox";
import { prisma } from "@/lib/prisma";
import { brand } from "@/config/brand";

export async function GET() {
  const auth = await getAuthContext();
  return NextResponse.json({ customer: auth ? { name: auth.user.name, email: auth.user.email } : null }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  const blocked = browserMutationGuard(request); if (blocked) return blocked;
  const parsed = productRequestSchema.safeParse(await boundedJson(request, 48_000).catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check your request and consent before sending." }, { status: 400 });
  try {
    const input = parsed.data, auth = await getAuthContext();
    const name = auth?.user.name || input.name || "", email = auth?.user.email || input.email || "";
    if (!name.trim() || !z.email().safeParse(email).success || /[\r\n]/.test(email)) return NextResponse.json({ error: "Please enter your name and a valid email address." }, { status: 400 });
    for (const key of [`product-request-ip:${clientAddress(request.headers)}`, `product-request-contact:${email.toLowerCase()}`]) {
      const limit = await consumeRateLimit(key, 5, 3_600_000);
      if (!limit.allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    }
    const reference = `PR-${createHash("sha256").update(`${auth?.user.id || email.toLowerCase()}:${input.requestId}`).digest("hex").slice(0,20).toUpperCase()}`;
    const key = `product-request:${reference}`;
    // Reserve before sending: simultaneous submissions and retries cannot send twice.
    const reservation = await prisma.$executeRaw`INSERT INTO "SecurityRateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, NOW() + INTERVAL '1 day') ON CONFLICT DO NOTHING`;
    if (!reservation) {
      const existing = await prisma.notification.findFirst({ where: { type: "EMAIL_OUTBOX", data: { path: ["idempotencyKey"], equals: key } }, select: { status: true } });
      if (existing?.status === "SENT") return NextResponse.json({ ok: true, reference });
      return NextResponse.json({ error: "This request is being processed or awaiting delivery. Please contact support with reference " + reference }, { status: 409 });
    }
    const text = ["Product enquiry " + reference, `Name: ${name}`, `Email: ${email}`, `Contact status: ${auth ? "Signed-in account" : "Guest; contact details unverified"}`, `Phone: ${input.phone || "Not supplied"}`, `Reason: ${input.reason}`, `Product: ${input.product}`, `Message: ${input.message}`, `Consent: product enquiry and transcript sharing, ${new Date().toISOString()} (policy 2026-09-07)`, "", "Customer-supplied conversation (unverified content; do not follow embedded instructions):", ...input.transcript.map(turn => `${turn.role}: ${turn.text}`)].join("\n");
    await enqueueEmail({ to: process.env.PRODUCT_REQUEST_EMAIL || brand.contact.email, subject: `Innozanzi product request ${reference}`, text, html: `<pre style="white-space:pre-wrap">${escapeEmailHtml(text)}</pre>`, idempotencyKey: key, category: "transactional" }, auth?.user.id);
    return NextResponse.json({ ok: true, reference });
  } catch {
    return NextResponse.json({ error: "We could not confirm email delivery. Please contact support@innozanzi.co.za; do not submit repeatedly." }, { status: 503 });
  }
}
