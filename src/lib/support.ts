export const supportEmail = process.env.SUPPORT_EMAIL ?? "support@innozanzi.co.za";
export const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "27712384185").replace(/\D/g, "");

export function whatsappUrl(message = "Hello Innozanzi, I need help with business technology procurement.") {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
