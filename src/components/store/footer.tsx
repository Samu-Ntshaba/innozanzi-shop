import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { whatsappUrl } from "@/lib/support";

export function StoreFooter() {
  return (
    <footer className="mt-16 bg-[#071b33] text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <BrandLogo variant="footer" className="w-44" />
          <p className="mt-4 text-sm leading-6">Your technology partner from quotation and expert guidance to delivery, deployment and ongoing support.</p>
        </div>
        <div><p className="font-semibold text-white">Explore</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/shop">Products</Link></li><li><Link href="/quotations/request">Request a quotation</Link></li><li><Link href="/partners">Partners</Link></li></ul></div>
        <div><p className="font-semibold text-white">Support</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/contact">Contact our team</Link></li><li><a href={whatsappUrl()} target="_blank" rel="noreferrer">WhatsApp: 071 238 4185</a></li><li><Link href="/returns-policy">Returns and assistance</Link></li><li><Link href="/policies/privacy">Privacy</Link></li></ul></div>
      </div>
      <div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} Innozanzi (Pty) Ltd. All rights reserved.</div>
    </footer>
  );
}
