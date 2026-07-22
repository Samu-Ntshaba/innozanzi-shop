import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/domain/auth/session";
import { setQuotationStatus } from "@/domain/quotations/actions";
import { convertQuotationToOrder } from "@/domain/quotations/conversion";
import { AdminPage, Panel, tableClass } from "@/components/admin/admin-ui";

export default async function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("quotations.manage");
  const quote = await prisma.quotation.findUnique({ where: { id: (await params).id }, include: { items: true, quotationRequest: true } });
  if (!quote) notFound();
  return <AdminPage title={quote.quotationNumber} description={`Version ${quote.version} - ${quote.status}`} actions={<Link className="rounded-lg bg-[#071b33] px-4 py-2 text-white" href={`/api/quotations/${quote.quotationNumber}/pdf`} target="_blank">Open PDF</Link>}><Panel><p className="mb-4 text-sm text-slate-600">Customer: {quote.quotationRequest?.contactName} ({quote.quotationRequest?.email}) - Valid until {quote.validUntil.toLocaleDateString("en-ZA")}</p><table className={tableClass}><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>VAT</th><th>Total</th></tr></thead><tbody>{quote.items.map((item) => <tr key={item.id}><td>{item.productName}</td><td>{item.quantity}</td><td>R {item.unitPrice.toString()}</td><td>R {item.vatTotal.toString()}</td><td>R {item.lineTotal.toString()}</td></tr>)}</tbody></table><div className="mt-5 flex flex-wrap items-center justify-between gap-4"><strong className="text-xl">Grand total: R {quote.grandTotal.toString()}</strong><div className="flex gap-3">{quote.status === "ACCEPTED" && !quote.convertedOrderId ? <form action={convertQuotationToOrder}><input type="hidden" name="id" value={quote.id}/><button className="rounded bg-emerald-700 px-3 py-2 text-white">Convert to order</button></form> : null}<form action={setQuotationStatus} className="flex gap-2"><input type="hidden" name="id" value={quote.id}/><select className="rounded border px-3" name="status" defaultValue={quote.status}>{["ISSUED","ACCEPTED","REJECTED","EXPIRED","CANCELLED"].map((status) => <option key={status}>{status}</option>)}</select><button className="text-sky-800 underline">Update</button></form></div></div></Panel></AdminPage>;
}
