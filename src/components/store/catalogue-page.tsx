import Link from "next/link";
import { ProductCard } from "./product-card";
import { getCatalogue } from "@/domain/catalogue/queries";

type CatalogueParams = { search?: string; category?: string; brand?: string; availability?: string; promotion?: string; sort?: string; page?: string };

export async function CataloguePage({ params, heading = "Shop technology" }: { params: CatalogueParams; heading?: string }) {
  const result = await getCatalogue({ ...params, page: Number(params.page) || 1 });
  const filters = <>
    <input className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="search" defaultValue={params.search} placeholder="Search products or SKU" />
    <select className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="category" defaultValue={params.category}><option value="">All categories</option>{result.categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select>
    <select className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="brand" defaultValue={params.brand}><option value="">All brands</option>{result.brands.map(brand => <option key={brand.slug} value={brand.slug}>{brand.name}</option>)}</select>
    <select className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="availability" defaultValue={params.availability}><option value="">Any availability</option><option value="in-stock">In stock</option></select>
    <select className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="promotion" defaultValue={params.promotion}><option value="">All catalogue products</option><option value="active">Supplier promotions</option></select>
    <select className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="sort" defaultValue={params.sort}><option value="newest">Recently updated</option><option value="name">Name A–Z</option><option value="stock">Most available</option><option value="oldest">Oldest updated</option></select>
    <button className="h-12 rounded-md bg-[#071b33] px-4 text-sm font-semibold text-white" type="submit">Show products</button>
  </>;
  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
    <div className="mb-5 sm:mb-8"><p className="text-xs font-bold uppercase tracking-widest text-sky-800">Innozanzi catalogue</p><h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h1><p className="mt-1 text-sm text-slate-600">{result.total} products</p></div>
    <details className="group mb-5 rounded-lg border border-slate-200 bg-slate-50 sm:hidden"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold [&::-webkit-details-marker]:hidden">Search &amp; filters <span className="text-xl text-sky-700 transition group-open:rotate-45">+</span></summary><form className="grid gap-3 border-t border-slate-200 p-4">{filters}</form></details>
    <form className="mb-7 hidden gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">{filters}</form>
    {result.products.length ? <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">{result.products.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="rounded-lg border border-dashed border-slate-300 px-4 py-16 text-center"><h2 className="text-xl font-semibold">No products found</h2><p className="mt-2 text-slate-600">Try changing your search or filters.</p></div>}
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap justify-center gap-2 sm:mt-10">{Array.from({ length: Math.min(7, result.pages) }, (_, index) => Math.max(1, Math.min(result.pages - 6, result.page - 3)) + index).map(page => { const query = new URLSearchParams(Object.entries({ ...params, page: String(page) }).filter(([, value]) => value) as [string, string][]); return <Link key={page} className={`grid size-11 place-items-center rounded-lg border ${page === result.page ? "border-sky-600 bg-sky-600 text-white" : "border-zinc-300"}`} href={`?${query}`}>{page}</Link>; })}</nav>
  </main>;
}
