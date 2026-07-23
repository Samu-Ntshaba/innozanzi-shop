import Link from "next/link";
import { AdminPage,Panel,StatusBadge,buttonClass,tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { createInvoiceFromOrder } from "@/domain/documents/actions";
import { createInvoiceFromQuotation } from "@/domain/quotations/actions";
import { prisma } from "@/lib/prisma";

export default async function InvoicesPage(){
  await requirePermission("quotations.manage");
  const [rows,orders,quotes]=await Promise.all([
    prisma.invoice.findMany({include:{quotation:{select:{quotationNumber:true}},order:{select:{orderNumber:true}}},orderBy:{createdAt:"desc"},take:100}),
    prisma.order.findMany({where:{status:{notIn:["DRAFT","CANCELLED"]},invoices:{none:{status:{notIn:["VOID","CANCELLED"]}}}},select:{id:true,orderNumber:true,companyName:true,email:true,grandTotal:true},take:50,orderBy:{createdAt:"desc"}}),
    prisma.quotation.findMany({where:{status:{in:["ACCEPTED","PAYMENT_VERIFIED","CONVERTED"]},invoices:{none:{status:{notIn:["VOID","CANCELLED"]}}}},include:{quotationRequest:true},take:50,orderBy:{updatedAt:"desc"}})
  ]);
  const outstanding=rows.filter(x=>!["PAID","VOID","CANCELLED","CREDITED"].includes(x.status)).reduce((n,x)=>n+Number(x.balanceDue),0);
  return <AdminPage title="Invoices" description="Create, issue and reconcile customer invoices from one controlled document register." actions={<Link className={buttonClass} href="/admin/invoices/new">New manual invoice</Link>}>
    <div className="grid gap-3 sm:grid-cols-3"><Summary label="Invoices" value={rows.length}/><Summary label="Outstanding" value={`R ${outstanding.toLocaleString("en-ZA",{minimumFractionDigits:2})}`}/><Summary label="Paid" value={rows.filter(x=>x.status==="PAID").length}/></div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Generate from order" description="Customer, address, items and agreed prices are copied automatically."><form action={createInvoiceFromOrder} className="flex gap-2"><select className="min-h-11 min-w-0 flex-1 border border-slate-300 bg-white px-3" name="orderId" required><option value="">Select eligible order</option>{orders.map(x=><option key={x.id} value={x.id}>{x.orderNumber} · {x.companyName??x.email} · R {Number(x.grandTotal).toFixed(2)}</option>)}</select><button className={buttonClass}>Generate</button></form></Panel>
      <Panel title="Generate from quotation" description="Use the approved commercial terms without re-entering data."><form action={createInvoiceFromQuotation} className="flex gap-2"><select className="min-h-11 min-w-0 flex-1 border border-slate-300 bg-white px-3" name="id" required><option value="">Select eligible quotation</option>{quotes.map(x=><option key={x.id} value={x.id}>{x.quotationNumber} · {x.quotationRequest?.companyName??x.quotationRequest?.contactName} · R {Number(x.grandTotal).toFixed(2)}</option>)}</select><button className={buttonClass}>Generate</button></form></Panel>
    </div>
    <Panel><div className="-mx-4 overflow-x-auto"><table className={tableClass}><thead><tr><th>Invoice</th><th>Customer</th><th>Origin</th><th>Source</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><Link className="font-bold text-sky-700" href={`/admin/invoices/${x.id}`}>{x.invoiceNumber}</Link></td><td>{x.companyName??x.customerName}<br/><span className="text-xs text-slate-500">{x.customerEmail}</span></td><td>{x.origin}</td><td>{x.order?.orderNumber??x.quotation?.quotationNumber??"Standalone"}</td><td>R {Number(x.grandTotal).toFixed(2)}</td><td>R {Number(x.balanceDue).toFixed(2)}</td><td><StatusBadge value={x.status}/></td></tr>)}{!rows.length?<tr><td colSpan={7} className="py-10 text-center text-slate-500">No invoices recorded.</td></tr>:null}</tbody></table></div></Panel>
  </AdminPage>;
}
function Summary({label,value}:{label:string;value:string|number}){return <div className="border border-slate-300 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>}
