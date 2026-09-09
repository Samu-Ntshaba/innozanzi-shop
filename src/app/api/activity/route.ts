import { getAuthContext } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return new Response(null, { status: 204 });
  await prisma.session.updateMany({ where: { id: ctx.sessionId, expires: { gt: new Date() } }, data: { lastSeenAt: new Date() } });
  return new Response(null, { status: 204 });
}
