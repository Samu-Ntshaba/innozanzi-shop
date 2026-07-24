import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function StoreFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-[#071b33] text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <BrandLogo variant="footer" className="w-44" />
          <p className="mt-4 text-sm leading-6">Your technology partner from quotation and expert guidance to delivery, deployment and ongoing support.</p>
        </div>
        <div><p className="font-semibold text-white">Explore</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/shop">Products</Link></li></ul></div>
        <div><p className="font-semibold text-white">Support</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/how-to">How-to guides</Link></li><li><Link href="/returns-policy">Returns and assistance</Link></li><li><Link href="/policies/terms">Terms &amp; Conditions</Link></li><li><Link href="/policies/privacy">Privacy Policy</Link></li></ul></div>
      </div>
      <div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} Innozanzi (Pty) Ltd. All rights reserved.</div>
    </footer>
  );
}
