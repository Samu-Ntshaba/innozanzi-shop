import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { locationSchema, provinces } from "./schema";

export function mapsConfigured() { return Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim() && !/replace|placeholder|your[_-]/i.test(process.env.GOOGLE_MAPS_API_KEY)); }
function key() { if (!mapsConfigured()) throw new Error("Address search is not configured."); return process.env.GOOGLE_MAPS_API_KEY!.trim(); }
const proofSchema = z.object({ userId: z.string(), placeId: z.string().min(1).max(256), expires: z.number(), address: locationSchema });
function signature(payload: string) { return createHmac("sha256", key()).update(`innozanzi-address-v1:${payload}`).digest(); }
export function signAddress(userId: string, placeId: string, address: z.infer<typeof locationSchema>) {
  const payload = Buffer.from(JSON.stringify({ userId, placeId, address: locationSchema.parse(address), expires: Date.now() + 30 * 60_000 })).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}
export function verifyAddress(token: string, userId: string, address: unknown) {
  try {
    if (token.length > 4096) throw new Error();
    const [payload, mac, extra] = token.split(".");
    if (!payload || !mac || extra) throw new Error();
    const actual = Buffer.from(mac, "base64url"), expected = signature(payload);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const proof = proofSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString()));
    if (proof.userId !== userId || proof.expires <= Date.now() || JSON.stringify(locationSchema.parse(address)) !== JSON.stringify(proof.address)) throw new Error();
    return proof.placeId;
  } catch { throw new Error("Please select your street address from Google again before continuing."); }
}
const componentSchema = z.object({ longText: z.string(), shortText: z.string().optional(), types: z.array(z.string()) });
export function normalizePlace(value: unknown) {
  const data = z.object({ id: z.string(), addressComponents: z.array(componentSchema) }).parse(value);
  const get = (type: string) => data.addressComponents.find(c => c.types.includes(type));
  if (get("country")?.shortText !== "ZA") throw new Error("Please choose a South African delivery address.");
  const street = get("route")?.longText;
  const number = get("street_number")?.longText;
  const property = get("premise")?.longText;
  const line1 = [number ?? property, street].filter(Boolean).join(" ") || property;
  const provinceComponent = get("administrative_area_level_1");
  const provinceAliases: Record<string, (typeof provinces)[number]> = {
    EC: "Eastern Cape", FS: "Free State", GP: "Gauteng", KZN: "KwaZulu-Natal",
    LP: "Limpopo", MP: "Mpumalanga", NW: "North West", NC: "Northern Cape", WC: "Western Cape",
  };
  const normalizedProvince = provinceComponent?.longText.toLowerCase().replace(/[^a-z]/g, "");
  const province = provinceAliases[provinceComponent?.shortText?.toUpperCase() ?? ""] ?? provinces.find(p => p.toLowerCase().replace(/[^a-z]/g, "") === normalizedProvince);
  const suburb = get("sublocality_level_1")?.longText ?? get("sublocality")?.longText ?? get("neighborhood")?.longText ?? "";
  const city = get("locality")?.longText ?? get("postal_town")?.longText ?? get("administrative_area_level_2")?.longText ?? suburb;
  const parsed = locationSchema.safeParse({ line1, suburb, city, province, postalCode: get("postal_code")?.longText });
  if (!parsed.success) throw new Error("Google could not provide a complete delivery address. Try a more specific street address or contact support.");
  return { placeId: data.id, address: parsed.data };
}
async function google(path: string, fields: string, body?: unknown) {
  const response = await fetch(`https://places.googleapis.com/v1/${path}`, { method: body ? "POST" : "GET", headers: { "X-Goog-Api-Key": key(), "X-Goog-FieldMask": fields, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Address search is temporarily unavailable. Please retry or contact support.");
  return response.json();
}
export async function searchAddresses(input: string, sessionToken: string) {
  const result = await google("places:autocomplete", "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text", { input, sessionToken, includedRegionCodes: ["za"], languageCode: "en" });
  return z.object({ suggestions: z.array(z.object({ placePrediction: z.object({ placeId: z.string(), text: z.object({ text: z.string() }) }).optional() })).optional() }).parse(result).suggestions?.flatMap(s => s.placePrediction ? [{ id: s.placePrediction.placeId, text: s.placePrediction.text.text }] : []) ?? [];
}
export async function resolveAddress(placeId: string, sessionToken: string) {
  return normalizePlace(await google(`places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}&languageCode=en`, "id,addressComponents"));
}
