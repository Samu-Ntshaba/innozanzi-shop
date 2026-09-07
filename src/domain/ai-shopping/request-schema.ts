import { z } from "zod";
export const productRequestSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().max(254).optional(),
  phone: z.string().trim().max(40).optional(),
  product: z.string().trim().min(3).max(500),
  message: z.string().trim().max(2000),
  reason: z.enum(["NOT_FOUND", "OUT_OF_STOCK", "ADVICE"]),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
  transcript: z.array(z.object({ role: z.enum(["customer", "assistant"]), text: z.string().max(2000) })).max(20),
});
export const escapeEmailHtml = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
