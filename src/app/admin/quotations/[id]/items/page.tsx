import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage, Panel, buttonClass, inputClass, tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { getAdminCatalogueOptions } from "@/domain/catalogue/admin-catalogue";
import { addQuotationAlternative, removeQuotationItem } from "@/domain/quotations/editor-actions";
import { prisma } from "@/lib/prisma";

export default async function ItemEditor({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("quotations.manage");
  const { id } = await params;
  const [quote, products] = await Promise.all([
    prisma.quotation.findUnique({ where: { id }, include: { items: true } }),
    getAdminCatalogueOptions(),
  ]);
  if (!quote) notFound();
  return <AdminPage title="Quotation item alternatives" description={`${quote.quotationNumber} · unified catalogue replacement workspace`} actions={<Link className={buttonClass} href={`/admin/quotations/${id}`}>Return to final review</Link>}>
    <Panel><p className="text-sm text-slate-600">Remove unavailable requested lines or add approved alternatives. Supplier identity and cost remain private and pricing is recalculated from the quotation markup.</p><table className={`${tableClass} mt-4`}><thead><tr><th>Item</th><th>Quantity</th><th>Action</th></tr></thead><tbody>{quote.items.map(item => <tr key={item.id}><td>{item.productName}<br/><span className="text-xs text-slate-500">{item.sku}</span></td><td>{item.quantity}</td><td>{quote.kind === "PROVISIONAL" ? <form action={removeQuotationItem}><input type="hidden" name="quotationId" value={id}/><input type="hidden" name="itemId" value={item.id}/><button className="text-red-700 underline">Remove unavailable item</button></form> : "Final locked"}</td></tr>)}</tbody></table></Panel>
    {quote.kind === "PROVISIONAL" ? <Panel><h2 className="font-bold">Add alternative product</h2><form action={addQuotationAlternative} className="mt-4 flex flex-wrap items-end gap-3"><input type="hidden" name="quotationId" value={id}/><label className="min-w-72 flex-1 text-sm">Product<select className={`${inputClass} mt-1 w-full`} name="catalogueReference" required><option value="">Select catalogue product</option>{products.map(product => <option key={product.reference} value={product.reference}>{product.name} · {product.sku} · {product.supplierName ?? "Innozanzi"}</option>)}</select></label><label className="text-sm">Quantity<input className={`${inputClass} mt-1 w-28`} name="quantity" type="number" min="1" defaultValue="1"/></label><button className={buttonClass}>Add alternative</button></form></Panel> : null}
  </AdminPage>;
}
