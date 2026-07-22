import {
  ChevronDown,
  Headphones,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { getCurrentCart } from "@/domain/cart/service";

const categories = [
  ["Laptops", "laptops"],
  ["Desktops", "desktop-computers"],
  ["Monitors", "monitors"],
  ["Power & UPS", "ups-and-power"],
  ["Networking", "networking"],
  ["Printers", "printers"],
  ["Accessories", "keyboards-and-mice"],
] as const;

export async function StoreHeader() {
  let cartCount = 0;
  try {
    const cart = await getCurrentCart();
    cartCount = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  } catch (error) {
    console.error("Cart count unavailable", error);
  }
  return (
    <>
      <div className="bg-[#071b33] px-4 py-2 text-center text-xs text-sky-50">
        Free delivery on qualifying orders · Business pricing available nationwide
      </div>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6 lg:px-8">
          <button aria-label="Open menu" className="rounded-lg border border-slate-200 p-2 text-slate-700 lg:hidden">
            <Menu className="size-5" />
          </button>
          <BrandLogo className="w-32 sm:w-44" priority />
          <form action="/shop" className="order-last w-full basis-full sm:order-none sm:flex-1 sm:basis-auto">
            <label className="flex w-full items-center overflow-hidden rounded-lg border-2 border-sky-500 bg-white focus-within:ring-2 focus-within:ring-sky-100">
              <input className="h-11 min-w-0 flex-1 px-4 text-sm outline-none" name="search" placeholder="What are you looking for?" />
              <button aria-label="Search products" className="grid h-11 w-12 place-items-center bg-sky-600 text-white hover:bg-sky-700" type="submit">
                <Search className="size-5" />
              </button>
            </label>
          </form>
          <nav aria-label="Customer shortcuts" className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link className="hidden items-center gap-2 rounded-lg p-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700 sm:flex" href="/contact">
              <Headphones className="size-5" /><span className="hidden xl:inline">Help</span>
            </Link>
            <Link className="flex items-center gap-2 rounded-lg p-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700" href="/account">
              <UserRound className="size-5" /><span className="hidden xl:inline">Account</span>
            </Link>
            <Link className="relative flex items-center gap-2 rounded-lg bg-[#071b33] px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800" href="/cart">
              <ShoppingCart className="size-5" /><span className="hidden sm:inline">Cart</span>
              <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950">{cartCount > 9 ? "9+" : cartCount}</span>
            </Link>
          </nav>
        </div>
        <div className="hidden border-t border-slate-100 lg:block">
          <nav aria-label="Product categories" className="mx-auto flex max-w-7xl items-center px-6 lg:px-8">
            <Link className="mr-3 flex h-11 items-center gap-2 bg-sky-600 px-5 text-sm font-bold text-white" href="/shop">
              <Menu className="size-4" /> All products <ChevronDown className="size-4" />
            </Link>
            {categories.map(([label, slug]) => (
              <Link key={slug} className="px-3 py-3 text-sm font-medium text-slate-700 hover:text-sky-700" href={`/categories/${slug}`}>
                {label}
              </Link>
            ))}
            <Link className="ml-auto px-3 py-3 text-sm font-bold text-amber-700" href="/quotations/request">Bulk quotations</Link>
          </nav>
        </div>
      </header>
    </>
  );
}
