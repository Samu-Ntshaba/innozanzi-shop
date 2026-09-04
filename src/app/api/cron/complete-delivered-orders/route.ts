import { timingSafeEqual } from "node:crypto";
import { completeDeliveredOrders } from "@/domain/orders/auto-completion";
function allowed(request: Request) { const expected = process.env.CRON_SECRET, supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""; if (!expected) return false; const a = Buffer.from(expected), b = Buffer.from(supplied); return a.length === b.length && timingSafeEqual(a, b); }
export async function POST(request: Request) { if (!allowed(request)) return Response.json({ error: "Unauthorized" }, { status: 401 }); return Response.json(await completeDeliveredOrders()); }
