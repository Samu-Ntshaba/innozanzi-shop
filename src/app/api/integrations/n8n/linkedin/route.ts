import { authorisedN8n, linkedinResultSchema, nextLinkedinCandidate, recordLinkedinResult } from "@/domain/marketing/n8n-linkedin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!authorisedN8n(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const candidate = await nextLinkedinCandidate();
  return candidate ? Response.json(candidate) : Response.json({ error: "No eligible content is available" }, { status: 404 });
}

export async function POST(request: Request) {
  if (!authorisedN8n(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = linkedinResultSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid publishing result", issues: parsed.error.flatten() }, { status: 400 });
  const result = await recordLinkedinResult(parsed.data);
  return Response.json({ recorded: true, ...result });
}
