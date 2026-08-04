import Link from "next/link";
import { AdminPage, Panel, StatusBadge, inputClass, secondaryButtonClass, tableClass } from "@/components/admin/admin-ui";
import { setProductStatus } from "@/domain/admin/actions";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

const money=(value:{toString():string}|null|undefined)=>value?`R ${Number(value.toString()).toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—";

export default async function ProductsPage({searchParams}:{searchParams:Promise<{search?:string}>}) {
  await requirePermission("products.view");
  const search=(await searchParams).search?.trim();
  const manualWhere={deletedAt:null,...(search?{OR:[{name:{contains:search,mode:"insensitive" as const}},{sku:{contains:search,mode:"insensitive" as const}},{barcode:{contains:search,mode:"insensitive" as const}},{brand:{name:{contains:search,mode:"insensitive" as const}}},{category:{name:{contains:search,mode:"insensitive" as const}}}]}:{})};
  const supplierWhere={active:true,...(search?{OR:[{name:{contains:search,mode:"insensitive" as const}},{supplierSku:{contains:search,mode:"insensitive" as const}},{manufacturerSku:{contains:search,mode:"insensitive" as const}},{barcode:{contains:search,mode:"insensitive" as const}},{brand:{contains:search,mode:"insensitive" as const}},{category:{contains:search,mode:"insensitive" as const}}]}:{})};
  const[manualProducts,supplierProducts,manualTotal,supplierTotal]=await Promise.all([
    prisma.product.findMany({where:manualWhere,include:{category:true,brand:true,inventory:true},orderBy:{updatedAt:"desc"},take:search?200:100}),
    prisma.supplierCatalogueProduct.findMany({where:supplierWhere,include:{supplier:{select:{companyName:true}}},orderBy:{sourceUpdatedAt:"desc"},take:search?200:100}),
    prisma.product.count({where:manualWhere}),prisma.supplierCatalogueProduct.count({where:supplierWhere}),
  ]);
  const total=manualTotal+supplierTotal;
  return <AdminPage title="Products" description="Search the complete customer-facing catalogue by product name, SKU, manufacturer SKU, barcode, brand or category.">
    <Panel>
      <form className="flex flex-wrap gap-2"><input autoFocus className={`${inputClass} min-w-64 flex-1`} name="search" defaultValue={search} placeholder="Exact product name, SKU, MPN or barcode"/><button className={secondaryButtonClass}>Search all products</button>{search?<Link className={secondaryButtonClass} href="/admin/products">Clear</Link>:null}</form>
      <p className="mt-3 text-xs text-slate-500">{total.toLocaleString("en-ZA")} matching products · {manualTotal.toLocaleString("en-ZA")} managed internally · {supplierTotal.toLocaleString("en-ZA")} from supplier feeds</p>
    </Panel>
    <Panel title="Supplier-feed products" description="These products appear on the storefront directly from a supplier feed. Supplier cost is private; RRP or promotion is the customer pricing reference.">
      <table className={tableClass}><thead><tr><th>Product / exact identifiers</th><th>Supplier</th><th>Category</th><th>Supplier cost</th><th>Customer price</th><th>Stock</th><th></th></tr></thead><tbody>{supplierProducts.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small className="block text-slate-500">SKU {p.supplierSku}{p.manufacturerSku?` · MPN ${p.manufacturerSku}`:""}{p.barcode?` · Barcode ${p.barcode}`:""}</small></td><td>{p.supplier.companyName}</td><td>{p.category??"—"}</td><td className="text-rose-800">{money(p.costPrice)}<small className="block">Private</small></td><td>{money(p.promotionalPrice??p.recommendedRetail)}{p.promotionalPrice?<small className="block text-emerald-700">Promotion · RRP {money(p.recommendedRetail)}</small>:null}</td><td>{p.stock}<small className="block"><StatusBadge value={p.availability}/></small></td><td><Link className={secondaryButtonClass} href={`/admin/syntech/products/${p.id}`}>Inspect</Link></td></tr>)}</tbody></table>
      {!supplierProducts.length?<p className="py-8 text-center text-sm text-slate-500">No supplier-feed products match this search.</p>:null}{supplierTotal>supplierProducts.length?<p className="mt-3 text-xs text-slate-500">Showing the newest {supplierProducts.length.toLocaleString("en-ZA")} results. Search by SKU or product name to locate an exact item.</p>:null}
    </Panel>
    <Panel title="Internally managed products" description="These products are created and controlled directly in Innozanzi.">
      <table className={tableClass}><thead><tr><th>Product / exact identifiers</th><th>Category</th><th>Cost</th><th>Customer price</th><th>Available</th><th>Status</th><th>Manage</th></tr></thead><tbody>{manualProducts.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small className="block text-slate-500">SKU {p.sku}{p.barcode?` · Barcode ${p.barcode}`:""}</small></td><td>{p.category.name}</td><td className="text-rose-800">{money(p.costPrice)}<small className="block">Private</small></td><td>{money(p.salePrice??p.regularPrice)}{p.salePrice?<small className="block text-emerald-700">Sale · Regular {money(p.regularPrice)}</small>:null}</td><td>{p.inventory.reduce((n,i)=>n+i.onHand-i.reserved,0)}</td><td><StatusBadge value={p.status}/></td><td><form action={setProductStatus} className="flex gap-2"><input type="hidden" name="id" value={p.id}/><select name="status" defaultValue={p.status} className="rounded border px-2 py-1"><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select><button className="text-sky-800 underline">Save</button></form></td></tr>)}</tbody></table>
      {!manualProducts.length?<p className="py-8 text-center text-sm text-slate-500">No internally managed products match this search.</p>:null}
    </Panel>
  </AdminPage>;
}
