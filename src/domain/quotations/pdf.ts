import { type DocumentBranding, defaultDocumentBranding } from "@/domain/documents/branding";
import { commercialPdf } from "@/domain/documents/commercial-pdf";

type Money = { toString(): string };
type PdfQuote = {
  quotationNumber: string;
  validUntil: Date;
  grandTotal: Money;
  subtotal?: Money;
  vatTotal?: Money;
  deliveryTotal?: Money;
  discountTotal?: Money;
  kind?: string;
  terms?: string | null;
  notes?: string | null;
  bankDetails?: string | null;
  paymentReference?: string | null;
  quotationRequest?: { contactName: string; companyName?: string | null; email: string } | null;
  createdBy?: { name?: string | null; email: string; phone?: string | null } | null;
  items: Array<{ productName: string; sku?: string | null; quantity: number; unitPrice: Money; lineTotal: Money }>;
};

const money = (value?: Money) =>
  `R ${Number(value?.toString() ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

export function quotationPdf(quote: PdfQuote, branding: DocumentBranding = defaultDocumentBranding) {
  const final = quote.kind === "FINAL";
  const customer = quote.quotationRequest;
  const notes = [
    quote.notes,
    quote.terms ? `Terms: ${quote.terms}` : null,
    Number(quote.deliveryTotal?.toString() ?? 0) ? `Delivery: ${money(quote.deliveryTotal)}` : null,
    Number(quote.discountTotal?.toString() ?? 0) ? `Discount: -${money(quote.discountTotal)}` : null,
    final && quote.paymentReference ? `Payment reference: ${quote.paymentReference}` : null,
    final && quote.bankDetails ? `Banking details: ${quote.bankDetails}` : null,
    quote.createdBy
      ? `Prepared by: ${quote.createdBy.name ?? quote.createdBy.email}${quote.createdBy.phone ? ` | ${quote.createdBy.phone}` : ""}`
      : null,
    final
      ? "Upload proof of payment through your secure account. Processing begins only after verification."
      : "This provisional quotation is subject to review. Please do not make payment until a final quotation is issued.",
  ].filter(Boolean).join("\n\n");

  return commercialPdf({
    title: final ? "FINAL QUOTATION" : "PROVISIONAL QUOTATION",
    number: quote.quotationNumber,
    customer: customer?.companyName ?? customer?.contactName ?? "Customer",
    email: customer?.email ?? "",
    issueDate: new Date(),
    dueDate: quote.validUntil,
    lines: quote.items.map((item) => ({
      description: item.sku ? `${item.productName} (${item.sku})` : item.productName,
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      total: money(item.lineTotal),
    })),
    subtotal: money(quote.subtotal),
    vat: money(quote.vatTotal),
    total: money(quote.grandTotal),
    notes,
  }, branding);
}
