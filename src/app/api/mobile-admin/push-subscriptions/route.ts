import { z } from "zod";
import { requireMobileAdmin } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({ endpoint: z.string().url().max(4000), keys: z.object({ p256dh: z.string().min(20).max(1000), auth: z.string().min(8).max(1000) }) });

export async function POST(request: Request) {
  const ctx = await requireMobileAdmin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid push subscription." }, { status: 400 });
  await prisma.pushSubscription.upsert({ where: { endpoint: parsed.data.endpoint }, update: { userId: ctx.user.id, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth, userAgent: request.headers.get("user-agent")?.slice(0, 500) }, create: { userId: ctx.user.id, endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth, userAgent: request.headers.get("user-agent")?.slice(0, 500) } });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const ctx = await requireMobileAdmin();
  const endpoint = z.object({ endpoint: z.string().url() }).safeParse(await request.json().catch(() => null));
  if (!endpoint.success) return Response.json({ error: "Invalid push subscription." }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { userId: ctx.user.id, endpoint: endpoint.data.endpoint } });
  return Response.json({ ok: true });
}
