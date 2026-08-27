import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function StoreFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-[#071b33] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div>
          <BrandLogo variant="footer" className="w-44" />
          <p className="mt-4 text-sm leading-6">Laptops, computers and everyday technology chosen with care, delivered across South Africa and supported by real people.</p>
        </div>
        <div><p className="font-semibold text-white">Build your PC</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/build-a-pc">Start PC Builder</Link></li><li><Link href="/guides/how-to-build-your-own-pc">PC building guide</Link></li><li><Link href="/guides/parts-needed-to-build-a-pc">Parts you need</Link></li><li><Link href="/guides/build-a-pc-over-time">Build over time</Link></li></ul></div>
        <div><p className="font-semibold text-white">Gaming</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/gaming">Shop Gaming</Link></li><li><Link href="/guides/gaming-pc-builder-guide">Gaming PC guide</Link></li><li><Link href="/guides/gaming-pc-vs-gaming-laptop">PC vs laptop</Link></li><li><Link href="/guides/how-much-ram-for-gaming">Gaming memory</Link></li></ul></div>
        <div><p className="font-semibold text-white">Shop &amp; help</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/shop">All products</Link></li><li><Link href="/guides">All buying guides</Link></li><li><Link href="/how-to">Shopping &amp; payment</Link></li><li><Link href="/returns-policy">Returns &amp; refunds</Link></li><li><Link href="/contact">Contact support</Link></li></ul></div>
        <div><p className="font-semibold text-white">Information</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/account/orders">Track orders</Link></li><li><Link href="/policies/terms">Terms &amp; Conditions</Link></li><li><Link href="/policies/privacy">Privacy Policy</Link></li><li><Link href="/partners/apply">Become a partner</Link></li></ul></div>
      </div>
      <div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} Innozanzi (Pty) Ltd. All rights reserved.</div>
    </footer>
  );
}
