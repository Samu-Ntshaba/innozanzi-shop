import { authorisedSocialAutomation, recordSocialResult, reserveSocialContent, socialRequestSchema, socialResultSchema } from "@/domain/marketing/social-automation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!authorisedSocialAutomation(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const parsed = socialRequestSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return Response.json({ error: "Invalid content request", issues: parsed.error.flatten() }, { status: 400 });
  const delivery = await reserveSocialContent(parsed.data);
  if (!delivery) return Response.json({ error: parsed.data.stream === "CAMPAIGN" ? "No active campaign content is available" : "No eligible evergreen content is available" }, { status: 404 });
  const payload = delivery.payload as Record<string, unknown>;
  return Response.json({ ...payload, deliveryId: delivery.id, status: delivery.status });
}

export async function POST(request: Request) {
  if (!authorisedSocialAutomation(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = socialResultSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid publishing result", issues: parsed.error.flatten() }, { status: 400 });
  const delivery = await recordSocialResult(parsed.data);
  if (!delivery) return Response.json({ error: "Unknown delivery" }, { status: 404 });
  return Response.json({ recorded: true, deliveryId: delivery.id, status: delivery.status, publishedAt: delivery.publishedAt });
}
