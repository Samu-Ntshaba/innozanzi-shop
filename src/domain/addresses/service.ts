import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "./schema";
import { mapsConfigured, verifyAddress } from "./google-places";
import { getDeliveryProvinces } from "./delivery-areas";

async function ensureDeliveryProvince(province: string) {
  const supported = await getDeliveryProvinces();
  if (!supported.includes(province as (typeof supported)[number])) throw new Error("We currently deliver to " + supported.join(", ") + ".");
}

export async function deliveryFromForm(userId: string, form: FormData) {
  const id = form.get("addressId");
  if (id) {
    const saved = await prisma.address.findFirst({ where: { id: z.string().uuid().parse(id), userId, deletedAt: null, type: { in: ["DELIVERY", "BOTH"] } } });
    if (!saved) throw new Error("Choose one of your saved addresses or add a new address.");
    if (mapsConfigured() && !saved.googlePlaceId) throw new Error("Please add this address again using Google address search.");
    const parsedResult = addressSchema.safeParse({ ...saved, line2: saved.line2 ?? "", suburb: saved.suburb ?? "" });
    if (!parsedResult.success) throw new Error("Please add this address again with a valid cellphone number.");
    const parsed = parsedResult.data;
    await ensureDeliveryProvince(parsed.province);
    return { ...parsed, googlePlaceId: saved.googlePlaceId };
  }
  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    if (parsed.error.issues.length === 1 && parsed.error.issues[0]?.path[0] === "phone") throw new Error("Please enter a valid South African cellphone number.");
    throw new Error("Complete the recipient, phone, street, city, province and four-digit postal code.");
  }
  await ensureDeliveryProvince(parsed.data.province);
  const googlePlaceId = mapsConfigured() ? verifyAddress(String(form.get("addressProof") ?? ""), userId, parsed.data) : null;
  return { ...parsed.data, googlePlaceId };
}
export async function listAddresses(userId: string) {
  const addresses = await prisma.address.findMany({ where: { userId, deletedAt: null, type: { in: ["DELIVERY", "BOTH"] } }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], take: 20 });
  return addresses.map(a => ({ id: a.id, recipient: a.recipient, phone: a.phone ?? "", line1: a.line1, line2: a.line2 ?? "", suburb: a.suburb ?? "", city: a.city, province: a.province as import("./schema").DeliveryAddress["province"], postalCode: a.postalCode, isDefault: a.isDefault, googlePlaceId: a.googlePlaceId }));
}
