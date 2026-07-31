import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage, Panel, inputClass, buttonClass, secondaryButtonClass, tableClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { updateDistributor, uploadSupplierDocument } from "@/domain/suppliers/actions";
import { prisma } from "@/lib/prisma";

const F=({name,label,value,type="text",required=true}:{name:string;label:string;value:string;type?:string;required?:boolean})=><label className="text-sm font-semibold">{label}<input className={`${inputClass} mt-1 w-full`} name={name} type={type} defaultValue={value} required={required}/></label>;

export default async function DistributorPage({params}:{params:Promise<{id:string}>}){
  await requirePermission("products.update");const id=(await params).id;
  const row=await prisma.supplier.findUnique({where:{id,deletedAt:null},include:{documents:{include:{document:true},orderBy:{createdAt:"desc"}},_count:{select:{products:true}}}});
  if(!row)notFound();
  return <AdminPage title={row.companyName} description={`${row.registrationNo??"Registration pending"} · VAT ${row.vatNo??"pending"}`} actions={<Link className={secondaryButtonClass} href="/admin/suppliers">All distributors</Link>}>
    <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
      <Panel title="Distributor profile">
        <form action={updateDistributor} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={row.id}/>
          <F name="companyName" label="Registered company name" value={row.companyName}/><F name="registrationNo" label="Registration number" value={row.registrationNo??""}/>
          <F name="vatNo" label="VAT number" value={row.vatNo??""}/><F name="website" label="Website" value={row.website??""} type="url"/>
          <F name="contactPerson" label="Primary contact" value={row.contactPerson??""}/><F name="email" label="General email" value={row.email??""} type="email"/>
          <F name="phone" label="General telephone" value={row.phone??""} type="tel"/><F name="accountsContact" label="Accounts contact" value={row.accountsContact??""}/>
          <F name="accountsEmail" label="Accounts email" value={row.accountsEmail??""} type="email"/><F name="accountsPhone" label="Accounts telephone" value={row.accountsPhone??""} type="tel"/>
          <F name="accountNumber" label="Our account number" value={row.accountNumber??""} required={false}/><F name="resellerId" label="Reseller ID" value={row.resellerId??""} required={false}/>
          <F name="creditLimit" label="Credit limit (R)" value={row.creditLimit?.toString()??""} type="number" required={false}/>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input name="isActive" type="checkbox" defaultChecked={row.isActive}/>Active distributor</label>
          <label className="text-sm font-semibold md:col-span-2">Primary physical address<textarea className={`${inputClass} mt-1 min-h-20 w-full`} name="physicalAddress" defaultValue={row.physicalAddress??""} required/></label>
          <label className="text-sm font-semibold md:col-span-2">Additional branch address<textarea className={`${inputClass} mt-1 min-h-20 w-full`} name="branchAddress" defaultValue={row.branchAddress??""}/></label>
          <label className="text-sm font-semibold md:col-span-2">Payment and account terms<textarea className={`${inputClass} mt-1 min-h-28 w-full`} name="paymentTerms" defaultValue={row.paymentTerms??""} required/></label>
          <label className="text-sm font-semibold md:col-span-2">Internal notes<textarea className={`${inputClass} mt-1 min-h-24 w-full`} name="notes" defaultValue={row.notes??""}/></label>
          <button className={`${buttonClass} md:col-span-2`}>Save distributor</button>
        </form>
      </Panel>
      <div className="space-y-4">
        <Panel title="Upload private document">
          <form action={uploadSupplierDocument} className="grid gap-3">
            <input type="hidden" name="supplierId" value={row.id}/>
            <label className="text-sm font-semibold">Document type<select className={`${inputClass} mt-1 w-full`} name="type">{["PAYMENT_POLICY","RESELLER_CERTIFICATE","ACCOUNT_APPLICATION","PRICE_LIST","AGREEMENT","TAX_DOCUMENT","OTHER"].map(x=><option key={x}>{x.replaceAll("_"," ")}</option>)}</select></label>
            <F name="title" label="Document title" value=""/>
            <F name="expiryDate" label="Expiry date" value="" type="date" required={false}/>
            <label className="text-sm font-semibold">File<input className={`${inputClass} mt-1 w-full`} name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xlsx" required/></label>
            <label className="text-sm font-semibold">Notes<textarea className={`${inputClass} mt-1 min-h-20 w-full`} name="notes"/></label>
            <button className={buttonClass}>Upload document</button>
          </form>
        </Panel>
        <Panel title="Summary"><dl className="grid gap-3 text-sm"><div><dt className="font-bold">Linked products</dt><dd>{row._count.products}</dd></div><div><dt className="font-bold">Private documents</dt><dd>{row.documents.length}</dd></div><div><dt className="font-bold">Created</dt><dd>{row.createdAt.toLocaleString("en-ZA")}</dd></div></dl></Panel>
      </div>
    </div>
    <Panel title="Distributor documents">
      <table className={tableClass}><thead><tr><th>Title</th><th>Type</th><th>File</th><th>Expiry</th><th>Added</th></tr></thead><tbody>{row.documents.map(item=><tr key={item.id}><td><strong>{item.title}</strong>{item.notes?<><br/><span className="text-xs text-slate-500">{item.notes}</span></>:null}</td><td>{item.type.replaceAll("_"," ")}</td><td><a className="font-semibold text-sky-700 underline" href={`/api/documents/${item.documentId}`} target="_blank">{item.document.originalName}</a><br/><span className="text-xs text-slate-500">{Math.ceil(item.document.size/1024)} KB</span></td><td>{item.expiryDate?.toLocaleDateString("en-ZA")??"No expiry"}</td><td>{item.createdAt.toLocaleDateString("en-ZA")}</td></tr>)}{!row.documents.length?<tr><td colSpan={5}>No documents uploaded yet.</td></tr>:null}</tbody></table>
    </Panel>
  </AdminPage>;
}
