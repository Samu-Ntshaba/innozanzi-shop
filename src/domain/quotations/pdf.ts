type PdfQuote = { quotationNumber: string; validUntil: Date; grandTotal: { toString(): string }; items: Array<{ productName: string; quantity: number; unitPrice: { toString(): string }; lineTotal: { toString(): string } }> };

const escapePdf = (value: string) => value.replace(/([\\()])/g, "\\$1").replace(/[^\x20-\x7E]/g, "?");

export function quotationPdf(quote: PdfQuote) {
  const lines = ["Innozanzi Shop - Quotation", `Quotation: ${quote.quotationNumber}`, `Valid until: ${quote.validUntil.toISOString().slice(0, 10)}`, "", ...quote.items.map((item) => `${item.productName}  x${item.quantity}  R ${item.unitPrice}  R ${item.lineTotal}`), "", `Total: R ${quote.grandTotal}`];
  const y = 790;
  const content = lines.map((line, index) => `BT /F1 ${index === 0 ? 18 : 11} Tf 50 ${y - index * 24} Td (${escapePdf(line)}) Tj ET`).join("\n");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
