import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "./schema";
import { mapsConfigured, verifyAddress } from "./google-places";

export async function deliveryFromForm(userId: string, form: FormData) {
  const id = form.get("addressId");
  if (id) {
    const saved = await prisma.address.findFirst({ where: { id: z.string().uuid().parse(id), userId, deletedAt: null, type: { in: ["DELIVERY", "BOTH"] } } });
    if (!saved) throw new Error("Choose one of your saved addresses or add a new address.");
    if (mapsConfigured() && !saved.googlePlaceId) throw new Error("Please add this address again using Google address search.");
    return { ...addressSchema.parse({ ...saved, line2: saved.line2 ?? "", suburb: saved.suburb ?? "" }), googlePlaceId: saved.googlePlaceId };
  }
  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) throw new Error("Complete the recipient, phone, street, city, province and four-digit postal code.");
  const googlePlaceId = mapsConfigured() ? verifyAddress(String(form.get("addressProof") ?? ""), userId, parsed.data) : null;
  return { ...parsed.data, googlePlaceId };
}
export async function listAddresses(userId: string) {
  const addresses = await prisma.address.findMany({ where: { userId, deletedAt: null, type: { in: ["DELIVERY", "BOTH"] } }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], take: 20 });
  return addresses.map(a => ({ id: a.id, recipient: a.recipient, phone: a.phone ?? "", line1: a.line1, line2: a.line2 ?? "", suburb: a.suburb ?? "", city: a.city, province: a.province as import("./schema").DeliveryAddress["province"], postalCode: a.postalCode, isDefault: a.isDefault, googlePlaceId: a.googlePlaceId }));
}
