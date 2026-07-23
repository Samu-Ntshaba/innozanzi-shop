import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { whatsappUrl } from "@/lib/support";

export function StoreFooter() {
  return (
    <footer className="mt-16 bg-[#071b33] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <BrandLogo variant="footer" className="w-44" />
          <p className="mt-4 text-sm leading-6">Your technology partner from quotation and expert guidance to delivery, deployment and ongoing support.</p>
        </div>
        <div><p className="font-semibold text-white">Shop</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/shop">All products</Link></li><li><Link href="/categories/laptops">Laptops</Link></li><li><Link href="/categories/ups-and-power">Power and UPS</Link></li></ul></div>
        <div><p className="font-semibold text-white">Business</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/quotations/request">Request a quotation</Link></li><li><Link href="/partners">Partnership programme</Link></li><li><Link href="/contact">Contact sales</Link></li></ul></div>
        <div><p className="font-semibold text-white">Customer care</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/contact">Talk to our team</Link></li><li><a href={whatsappUrl()} target="_blank" rel="noreferrer">WhatsApp: 071 238 4185</a></li><li><Link href="/how-to">How-to guides</Link></li><li><Link href="/policies/delivery">Delivery</Link></li><li><Link href="/returns-policy">Returns and product assistance</Link></li><li><Link href="/policies/privacy">Privacy</Link></li></ul></div>
      </div>
      <div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} Innozanzi (Pty) Ltd. All rights reserved.</div>
    </footer>
  );
}
