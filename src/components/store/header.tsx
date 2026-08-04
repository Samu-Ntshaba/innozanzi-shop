import { Headphones, Menu, Search, ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { getCurrentCart } from "@/domain/cart/service";
import { combosEnabled } from "@/domain/combos/settings";
import { prisma } from "@/lib/prisma";

export async function StoreHeader() {
  let cartCount = 0;
  const [showCombos,supplierCategories]=await Promise.all([
    combosEnabled(),
    prisma.supplierCatalogueProduct.groupBy({by:["category"],where:{active:true,category:{not:null},images:{isEmpty:false}},_count:true,orderBy:{_count:{category:"desc"}},take:4}).catch(()=>[]),
  ]);
  const categories=supplierCategories.map(item=>item.category).filter((name):name is string=>Boolean(name));
  try {
    const cart = await getCurrentCart();
    cartCount = cart ? cart.items.reduce((total, item) => total + item.quantity, 0)+cart.supplierItems.reduce((total,item)=>total+item.quantity,0) : 0;
  } catch (error) {
    console.error("Cart count unavailable", error);
  }
  return <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-3 py-3 sm:gap-5 sm:px-6 lg:flex-nowrap lg:px-8">
      <details className="group relative lg:hidden">
        <summary aria-label="Open menu" style={{ listStyle: "none" }} className="grid size-11 cursor-pointer place-items-center rounded-md border border-slate-300 text-slate-700 [&::-webkit-details-marker]:hidden"><Menu className="size-5" /></summary>
        <nav aria-label="Mobile product navigation" className="absolute left-0 top-[3.25rem] z-50 w-[min(19rem,calc(100vw-1.5rem))] rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <Link className="block rounded-md bg-[#071b33] px-4 py-3 font-semibold text-white" href="/shop">All products</Link>
          {categories.map(category=><Link className="block rounded-md px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" href={`/categories/${encodeURIComponent(category)}`} key={category}>{category}</Link>)}
          <Link className="block rounded-md px-4 py-3 text-sm font-semibold text-sky-800 hover:bg-slate-50" href="/categories">More categories</Link>
          {showCombos?<Link className="block rounded-md px-4 py-3 text-sm font-semibold text-sky-800 hover:bg-slate-50" href="/combos">Combo deals</Link>:null}
          <Link className="block rounded-md px-4 py-3 text-sm font-semibold text-sky-800 hover:bg-slate-50" href="/blog">Insights</Link>
        </nav>
      </details>
      <BrandLogo className="w-32 min-[380px]:w-36 sm:w-44" priority />
      <form action="/shop" className="order-last w-full basis-full sm:order-none sm:flex-1 sm:basis-auto">
        <label className="flex w-full items-center overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-sky-700 focus-within:ring-1 focus-within:ring-sky-700">
          <input className="h-11 min-w-0 flex-1 px-4 text-sm outline-none" name="search" placeholder="Search products" />
          <button aria-label="Search products" className="grid h-11 w-12 place-items-center text-slate-700 hover:bg-slate-50" type="submit"><Search className="size-5" /></button>
        </label>
      </form>
      <nav aria-label="Customer shortcuts" className="ml-auto flex items-center gap-1">
        <Link className="hidden items-center gap-2 rounded-md p-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex" href="/contact"><Headphones className="size-5" /><span className="hidden xl:inline">Help</span></Link>
        <Link aria-label="Account" className="grid size-11 place-items-center rounded-md text-slate-700 hover:bg-slate-50 xl:flex xl:w-auto xl:gap-2 xl:px-3" href="/account"><UserRound className="size-5" /><span className="hidden xl:inline">Account</span></Link>
        <Link aria-label={`Quotation list with ${cartCount} requested item${cartCount === 1 ? "" : "s"}`} className="relative flex size-11 items-center justify-center rounded-md bg-[#071b33] text-white sm:w-auto sm:gap-2 sm:px-4" href="/cart">
          <ShoppingCart className="size-5" /><span className="hidden sm:inline">Quote</span>
          {cartCount ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-sky-600 text-[10px] font-bold text-white">{cartCount > 9 ? "9+" : cartCount}</span> : null}
        </Link>
      </nav>
    </div>
    <nav aria-label="Product categories" className="mx-auto hidden h-11 max-w-7xl items-center gap-7 border-t border-slate-100 px-6 lg:flex lg:px-8">
      <Link className="text-sm font-semibold text-sky-800" href="/shop">All products</Link>
      {showCombos?<Link className="text-sm font-semibold text-amber-700" href="/combos">Combo deals</Link>:null}
      {categories.map(category => <Link key={category} className="text-sm font-medium text-slate-600 hover:text-slate-950" href={`/categories/${encodeURIComponent(category)}`}>{category}</Link>)}
      <Link className="text-sm font-semibold text-sky-800 hover:underline" href="/categories">More categories</Link>
      <Link className="ml-auto text-sm font-medium text-slate-600 hover:text-slate-950" href="/blog">Insights</Link>
    </nav>
  </header>;
}
