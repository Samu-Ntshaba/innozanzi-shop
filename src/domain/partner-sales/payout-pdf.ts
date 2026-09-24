import { commercialPdf } from "@/domain/documents/commercial-pdf";
import { defaultDocumentBranding } from "@/domain/documents/branding";
import { csvCell } from "@/lib/security/csv";

export type PayoutStatementItem = {
  caseNumber?: string | null;
  orderNumber?: string | null;
  amount: string;
  status?: string | null;
};

export type PayoutStatementInput = {
  batchNumber: string;
  partnerName: string;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  total: string;
  items: readonly PayoutStatementItem[];
  /** Accepted for callers that pass an internal row; it is deliberately never rendered. */
  internalNote?: string | null;
};

function plain(value: unknown, fallback = "") {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/<[^>]*>/g, "").trim()
    : fallback;
}

function statementRows(input: PayoutStatementInput) {
  return input.items.map((item) => ({
    caseNumber: plain(item.caseNumber, "—"),
    orderNumber: plain(item.orderNumber, "—"),
    amount: plain(item.amount, "0.0000"),
    status: plain(item.status, "PAID").replaceAll("_", " "),
  }));
}

/** Partner-safe CSV: only the batch, business cases and paid amounts are exported. */
export function payoutStatementCsv(input: PayoutStatementInput) {
  const rows = statementRows(input);
  const header = ["batch_number", "partner", "period_start", "period_end", "currency", "case_number", "order_number", "amount", "status"];
  const values = rows.length ? rows : [{ caseNumber: "—", orderNumber: "—", amount: "0.0000", status: "PAID" }];
  return [
    header.map(csvCell).join(","),
    ...values.map((row) => [
      input.batchNumber,
      input.partnerName,
      input.periodStart.toISOString().slice(0, 10),
      input.periodEnd.toISOString().slice(0, 10),
      input.currency,
      row.caseNumber,
      row.orderNumber,
      row.amount,
      row.status,
    ].map(csvCell).join(",")),
    ["TOTAL", "", "", "", input.currency, "", "", input.total, ""].map(csvCell).join(","),
  ].join("\n");
}

/** Render a partner-safe statement PDF from allow-listed, immutable payout values. */
export function renderPayoutStatement(input: PayoutStatementInput) {
  const partner = plain(input.partnerName, "Partner");
  const lines = statementRows(input).map((row) => ({
    description: `${row.caseNumber} · ${row.orderNumber} · ${row.status}`,
    quantity: 1,
    unitPrice: `${plain(input.currency, "ZAR")} ${row.amount}`,
    total: `${plain(input.currency, "ZAR")} ${row.amount}`,
  }));
  return commercialPdf({
    title: "PARTNER PAYOUT STATEMENT",
    number: plain(input.batchNumber, "PAYOUT"),
    customer: partner,
    email: "",
    issueDate: new Date(),
    reference: `${input.periodStart.toISOString().slice(0, 10)} to ${input.periodEnd.toISOString().slice(0, 10)}`,
    lines,
    total: `${plain(input.currency, "ZAR")} ${plain(input.total, "0.0000")}`,
    notes: "This statement records the approved EFT payout issued by Innozanzi.",
  }, defaultDocumentBranding);
}
