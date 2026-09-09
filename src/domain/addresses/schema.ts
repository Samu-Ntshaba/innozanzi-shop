import { z } from "zod";

export const provinces = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"] as const;
export const cellphoneSchema = z.string().trim().min(1, "Enter a cellphone number.").refine(value => /^(?:\+27|0)[6-8]\d{8}$/.test(value.replace(/[\s()-]/g, "")), "Enter a valid South African cellphone number.").transform(value => value.replace(/[\s()-]/g, ""));
export const locationSchema = z.object({
  line1: z.string().trim().min(3).max(180),
  suburb: z.string().trim().max(120).default(""),
  city: z.string().trim().min(2).max(120),
  province: z.enum(provinces),
  postalCode: z.string().trim().regex(/^\d{4}$/, "Enter a four-digit South African postal code."),
});
export const addressSchema = locationSchema.extend({
  recipient: z.string().trim().min(2).max(120),
  phone: cellphoneSchema,
  line2: z.string().trim().max(180).default(""),
});
export type DeliveryAddress = z.infer<typeof addressSchema>;
export type SavedAddress = DeliveryAddress & { id: string; isDefault: boolean; googlePlaceId: string | null };
