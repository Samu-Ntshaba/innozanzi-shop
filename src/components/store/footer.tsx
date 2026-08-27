import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function StoreFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-[#071b33] text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <BrandLogo variant="footer" className="w-44" />
          <p className="mt-4 text-sm leading-6">Laptops, computers and everyday technology chosen with care, delivered across South Africa and supported by real people.</p>
        </div>
        <div><p className="font-semibold text-white">Shop</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/shop">All products</Link></li><li><Link href="/categories">Shop by category</Link></li><li><Link href="/gaming">Gaming</Link></li><li><Link href="/build-a-pc">Build a PC</Link></li></ul></div>
        <div><p className="font-semibold text-white">Customer care</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/how-to">Shopping &amp; payment help</Link></li><li><Link href="/returns-policy">Returns &amp; refunds</Link></li><li><Link href="/contact">Contact support</Link></li><li><Link href="/account/orders">Track your orders</Link></li></ul></div>
        <div><p className="font-semibold text-white">Information</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/policies/terms">Terms &amp; Conditions</Link></li><li><Link href="/policies/privacy">Privacy Policy</Link></li><li><Link href="/blog">Buying guides</Link></li><li><Link href="/partners/apply">Become a partner</Link></li></ul></div>
      </div>
      <div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} Innozanzi (Pty) Ltd. All rights reserved.</div>
    </footer>
  );
}
