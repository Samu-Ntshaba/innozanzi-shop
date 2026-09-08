import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/domain/auth/session";
import { consumeRateLimit } from "@/domain/auth/rate-limit";
import { boundedJson, browserMutationGuard, clientAddress } from "@/lib/security/request";
import { mapsConfigured, resolveAddress, searchAddresses, signAddress } from "@/domain/addresses/google-places";

export const runtime = "nodejs";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("search"), input: z.string().trim().min(3).max(180), sessionToken: z.string().uuid() }),
  z.object({ action: z.literal("resolve"), placeId: z.string().regex(/^[A-Za-z0-9_-]{1,256}$/), sessionToken: z.string().uuid() }),
]);
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function POST(request: Request) {
  const denied = browserMutationGuard(request); if (denied) return denied;
  const ctx = await getAuthContext(); if (!ctx) return json({ error: "Please sign in to search delivery addresses." }, 401);
  if (!mapsConfigured()) return json({ error: "Address search is not configured." }, 503);
  let data;
  try { data = schema.parse(await boundedJson(request, 2048)); } catch { return json({ error: "Invalid address search." }, 400); }
  const limits = await Promise.all([consumeRateLimit(`places:user:${ctx.user.id}`, 60, 60_000), consumeRateLimit(`places:ip:${clientAddress(request.headers)}`, 300, 60_000), consumeRateLimit("places:daily", 10000, 86_400_000)]);
  if (limits.some(limit => !limit.allowed)) return json({ error: "Too many address searches. Please wait a minute before retrying." }, 429);
  try {
    if (data.action === "search") return json({ suggestions: await searchAddresses(data.input, data.sessionToken) });
    const result = await resolveAddress(data.placeId, data.sessionToken);
    return json({ address: result.address, proof: signAddress(ctx.user.id, result.placeId, result.address) });
  } catch (error) {
    const message = error instanceof Error && /^(Please choose|Choose a complete|Google could not|Address search is temporarily)/.test(error.message) ? error.message : "Address search is temporarily unavailable. Please retry or contact support.";
    return json({ error: message }, 422);
  }
}
