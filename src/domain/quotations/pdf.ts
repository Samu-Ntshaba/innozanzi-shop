type Money = { toString(): string };
type PdfQuote = {
  quotationNumber: string; validUntil: Date; grandTotal: Money; subtotal?: Money; vatTotal?: Money;
  deliveryTotal?: Money; discountTotal?: Money; kind?: string; terms?: string | null; notes?: string | null;
  bankDetails?: string | null; paymentReference?: string | null;
  quotationRequest?: { contactName: string; companyName?: string | null; email: string } | null;
  items: Array<{ productName: string; sku?: string | null; quantity: number; unitPrice: Money; lineTotal: Money }>;
};

const escapePdf = (value: string) => value.replace(/([\\()])/g, "\\$1").replace(/[^\x20-\x7E]/g, "?");
const money = (value?: Money) => `R ${Number(value?.toString() ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

export function quotationPdf(quote: PdfQuote) {
  const final = quote.kind === "FINAL";
  const customer = quote.quotationRequest;
  const lines = [
    "INNOZANZI (PTY) LTD", final ? "FINAL QUOTATION" : "PROVISIONAL QUOTATION - SUBJECT TO REVIEW",
    `Quotation: ${quote.quotationNumber}`, `Issue date: ${new Date().toISOString().slice(0, 10)}`,
    `Expiry date: ${quote.validUntil.toISOString().slice(0, 10)}`,
    customer ? `Customer: ${customer.companyName ?? customer.contactName}` : "", customer ? `Email: ${customer.email}` : "", "",
    "Description | SKU | Qty | Unit price | Line total",
    ...quote.items.map(item => `${item.productName} | ${item.sku ?? "-"} | ${item.quantity} | ${money(item.unitPrice)} | ${money(item.lineTotal)}`),
    "", `Subtotal: ${money(quote.subtotal)}`, `VAT: ${money(quote.vatTotal)}`,
    Number(quote.deliveryTotal?.toString() ?? 0) ? `Delivery: ${money(quote.deliveryTotal)}` : "",
    Number(quote.discountTotal?.toString() ?? 0) ? `Discount: -${money(quote.discountTotal)}` : "",
    `TOTAL: ${money(quote.grandTotal)}`, "", quote.notes ? `Notes: ${quote.notes}` : "",
    quote.terms ? `Terms: ${quote.terms}` : "",
    final && quote.paymentReference ? `Payment reference: ${quote.paymentReference}` : "",
    final && quote.bankDetails ? `Banking details: ${quote.bankDetails}` : "",
    final ? "Upload proof of payment using the secure link in your account. Processing begins only after verification." : "Do not make payment against this provisional quotation.",
  ].filter(Boolean);
  const y = 810;
  const content = lines.slice(0, 34).map((line, index) => `BT /F1 ${index < 2 ? 16 : 9} Tf 38 ${y - index * 22} Td (${escapePdf(line)}) Tj ET`).join("\n");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
