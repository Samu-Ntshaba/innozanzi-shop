import Link from "next/link";
import { ProductCard } from "./product-card";
import { getCatalogue } from "@/domain/catalogue/queries";

type CatalogueParams = { search?: string; category?: string; brand?: string; sort?: string; page?: string; hideDemo?: string };

export async function CataloguePage({ params, heading = "Shop technology" }: { params: CatalogueParams; heading?: string }) {
  const result = await getCatalogue({ ...params, hideDemo:params.hideDemo==="1", page: Number(params.page) || 1 });
  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
    <div className="mb-6 sm:mb-8"><p className="text-sm font-medium text-sky-800">Innozanzi catalogue</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h1><p className="mt-2 text-slate-600">{result.total} products</p></div>
    <form className="mb-7 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-6">
      <input className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="search" defaultValue={params.search} placeholder="Search products or SKU" />
      <select className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="category" defaultValue={params.category}><option value="">All categories</option>{result.categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select>
      <select className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="brand" defaultValue={params.brand}><option value="">All brands</option>{result.brands.map((brand) => <option key={brand.slug} value={brand.slug}>{brand.name}</option>)}</select>
      <select className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="sort" defaultValue={params.sort}><option value="newest">Newest</option><option value="name">Name</option></select>
      <label className="flex h-12 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-slate-700"><input name="hideDemo" type="checkbox" value="1" defaultChecked={params.hideDemo==="1"}/>Hide demo products</label>
      <button className="h-12 rounded-md bg-[#071b33] px-4 text-sm font-semibold text-white" type="submit">Apply filters</button>
    </form>
    {result.products.length ? <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">{result.products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="rounded-lg border border-dashed border-slate-300 px-4 py-16 text-center"><h2 className="text-xl font-semibold">No products found</h2><p className="mt-2 text-slate-600">Try changing your search or filters.</p></div>}
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap justify-center gap-2">{Array.from({ length: result.pages }, (_, index) => index + 1).slice(0, 10).map((page) => { const query = new URLSearchParams(Object.entries({ ...params, page: String(page) }).filter(([, value]) => value) as [string, string][]); return <Link key={page} className={`grid size-11 place-items-center rounded-lg border ${page === result.page ? "border-sky-600 bg-sky-600 text-white" : "border-zinc-300"}`} href={`?${query}`}>{page}</Link>; })}</nav>
  </main>;
}
