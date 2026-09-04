import { CircleUserRound, Headphones, LogIn, Search, ShoppingCart, UserPlus } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { getCurrentCart } from "@/domain/cart/service";
import { getAuthContext } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { MobileMenu } from "@/components/store/mobile-menu";

export async function StoreHeader() {
  let cartCount = 0;
  const [auth,supplierCategories]=await Promise.all([
    getAuthContext(),
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
    <div className="mx-auto grid max-w-7xl grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-1 gap-y-2 px-2 py-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:gap-5 sm:px-6 sm:py-3 lg:flex lg:flex-nowrap lg:px-8">
      <MobileMenu categories={categories} signedIn={Boolean(auth)}/>
      <BrandLogo className="ml-1 w-28 sm:ml-0 sm:w-44" priority />
      <form action="/shop" className="order-last col-span-3 w-full sm:flex-1 lg:order-none lg:col-span-1">
        <label className="flex w-full items-center overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-sky-700 focus-within:ring-1 focus-within:ring-sky-700">
          <input className="h-10 min-w-0 flex-1 px-3 text-base outline-none sm:h-11 sm:px-4 sm:text-sm" name="search" enterKeyHint="search" autoComplete="off" placeholder="Search products or SKU" />
          <button aria-label="Search products" className="grid h-10 w-11 place-items-center text-slate-700 hover:bg-slate-50 sm:h-11 sm:w-12" type="submit"><Search className="size-5" /></button>
        </label>
      </form>
      <nav aria-label="Customer shortcuts" className="ml-auto flex shrink-0 items-center gap-1">
        <Link className="hidden items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex" href="/contact"><Headphones className="size-5" /><span className="hidden 2xl:inline">Help</span></Link>
        {auth ? <Link aria-label={`Signed in as ${auth.user.name??auth.user.email}. Open account`} title={`Signed in as ${auth.user.name??auth.user.email}`} className="relative grid size-10 place-items-center rounded-md text-slate-700 hover:bg-slate-100 sm:size-11" href="/account"><CircleUserRound className="size-5 sm:size-6" /><span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true"/></Link> : <>
          <Link aria-label="Log in to your account" title="Not signed in — log in" className="grid size-10 place-items-center whitespace-nowrap rounded-md text-slate-700 hover:bg-slate-100 sm:size-11 sm:border sm:border-slate-200 xl:flex xl:w-auto xl:gap-2 xl:px-3" href="/sign-in"><LogIn className="size-5" /><span className="hidden xl:inline">Log in</span></Link>
          <Link className="hidden min-h-10 items-center gap-2 whitespace-nowrap rounded-md bg-sky-700 px-4 text-sm font-bold text-white hover:bg-sky-800 sm:flex" href="/register"><UserPlus className="size-4" />Sign up</Link>
        </>}
        <Link aria-label={auth ? `Cart with ${cartCount} item${cartCount === 1 ? "" : "s"}` : "Log in to create a cart"} title={auth?"Cart":"Log in to create a cart"} className="relative grid size-10 place-items-center rounded-md bg-[#071b33] text-white sm:size-11" href={auth ? "/cart" : "/sign-in"}>
          <ShoppingCart className="size-5" />
          {cartCount ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-sky-600 text-[10px] font-bold text-white">{cartCount > 9 ? "9+" : cartCount}</span> : null}
        </Link>
      </nav>
    </div>
    <nav aria-label="Product categories" className="mx-auto hidden h-11 max-w-7xl items-center gap-7 border-t border-slate-100 px-6 lg:flex lg:px-8">
      <Link className="text-sm font-semibold text-sky-800" href="/shop">All products</Link>
      <Link className="text-sm font-semibold text-slate-700 hover:text-sky-800" href="/gaming">Gaming</Link>
      <Link className="text-sm font-semibold text-slate-700 hover:text-sky-800" href="/build-a-pc">Build a PC</Link>
      {categories.map(category => <Link key={category} className="text-sm font-medium text-slate-600 hover:text-slate-950" href={`/categories/${encodeURIComponent(category)}`}>{category}</Link>)}
      <Link className="text-sm font-semibold text-sky-800 hover:underline" href="/categories">More categories</Link>
      <Link className="ml-auto text-sm font-medium text-slate-600 hover:text-slate-950" href="/blog">Insights</Link>
    </nav>
  </header>;
}
