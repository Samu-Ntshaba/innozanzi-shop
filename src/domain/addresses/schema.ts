import { z } from "zod";

export const provinces = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"] as const;
export const locationSchema = z.object({
  line1: z.string().trim().min(3).max(180),
  suburb: z.string().trim().max(120).default(""),
  city: z.string().trim().min(2).max(120),
  province: z.enum(provinces),
  postalCode: z.string().trim().regex(/^\d{4}$/, "Enter a four-digit South African postal code."),
});
export const addressSchema = locationSchema.extend({
  recipient: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(40),
  line2: z.string().trim().max(180).default(""),
});
export type DeliveryAddress = z.infer<typeof addressSchema>;
export type SavedAddress = DeliveryAddress & { id: string; isDefault: boolean; googlePlaceId: string | null };
