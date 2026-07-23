import Link from "next/link";
import { ProductCard } from "./product-card";
import { getCatalogue } from "@/domain/catalogue/queries";

type CatalogueParams = { search?: string; category?: string; brand?: string; sort?: string; page?: string };

export async function CataloguePage({ params, heading = "Shop technology" }: { params: CatalogueParams; heading?: string }) {
  const result = await getCatalogue({ ...params, page: Number(params.page) || 1 });
  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
    <div className="mb-6 sm:mb-8"><p className="text-sm font-semibold uppercase tracking-wider text-sky-600">Innozanzi catalogue</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h1><p className="mt-2 text-zinc-600">{result.total} products</p></div>
    <form className="mb-7 grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <input className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="search" defaultValue={params.search} placeholder="Search products or SKU" />
      <select className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="category" defaultValue={params.category}><option value="">All categories</option>{result.categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select>
      <select className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="brand" defaultValue={params.brand}><option value="">All brands</option>{result.brands.map((brand) => <option key={brand.slug} value={brand.slug}>{brand.name}</option>)}</select>
      <select className="h-12 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base sm:text-sm" name="sort" defaultValue={params.sort}><option value="newest">Newest</option><option value="name">Name</option></select>
      <button className="h-12 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white" type="submit">Apply filters</button>
    </form>
    {result.products.length ? <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">{result.products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-16 text-center"><h2 className="text-xl font-semibold">No products found</h2><p className="mt-2 text-zinc-600">Try changing your search or filters.</p></div>}
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap justify-center gap-2">{Array.from({ length: result.pages }, (_, index) => index + 1).slice(0, 10).map((page) => { const query = new URLSearchParams(Object.entries({ ...params, page: String(page) }).filter(([, value]) => value) as [string, string][]); return <Link key={page} className={`grid size-11 place-items-center rounded-lg border ${page === result.page ? "border-sky-600 bg-sky-600 text-white" : "border-zinc-300"}`} href={`?${query}`}>{page}</Link>; })}</nav>
  </main>;
}
