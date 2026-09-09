import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { subscribeNewsletter } from "@/domain/communications/actions";
import { brand } from "@/config/brand";

export function StoreFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-[#071b33] text-slate-300">
      <div id="newsletter" className="scroll-mt-24 border-b border-slate-700/80">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-8">
          <div><p className="text-xl font-semibold text-white">Deals, new arrivals and useful ICT advice</p><p className="mt-1 text-sm text-slate-400">Occasional product updates. No noise, and you can unsubscribe at any time.</p></div>
          <form action={subscribeNewsletter} className="grid gap-3 sm:grid-cols-[1fr_auto]"><input aria-label="Email address" className="h-12 min-w-0 rounded-lg border border-slate-600 bg-white px-4 text-base text-slate-950 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20" name="email" type="email" inputMode="email" autoComplete="email" placeholder="Your email address" required/><button className="h-12 rounded-lg bg-sky-400 px-6 font-semibold text-slate-950 hover:bg-sky-300" type="submit">Subscribe</button></form>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div>
          <BrandLogo variant="footer" className="w-44" />
          <p className="mt-4 text-sm leading-6">{brand.description} {brand.promise}</p>
          <div className="mt-5 flex items-center gap-3" aria-label="Innozanzi social media">
            <a className="grid size-11 place-items-center rounded-full border border-slate-600 text-slate-300 transition hover:border-sky-300 hover:bg-sky-300 hover:text-slate-950" href={brand.social.instagram} target="_blank" rel="noreferrer" aria-label="Follow Innozanzi on Instagram"><svg className="size-5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
            <a className="grid size-11 place-items-center rounded-full border border-slate-600 text-slate-300 transition hover:border-sky-300 hover:bg-sky-300 hover:text-slate-950" href={brand.social.facebook} target="_blank" rel="noreferrer" aria-label="Follow Innozanzi on Facebook"><svg className="size-5" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M14 8.5V7c0-.9.6-1 1.1-1H18V2.1A38 38 0 0 0 14.6 2C11.2 2 9 4.1 9 7.9v.6H6V13h3v9h5v-9h3.5l.5-4.5H14Z"/></svg></a>
          </div>
        </div>
        <div><p className="font-semibold text-white">Build your PC</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/build-a-pc">Start PC Builder</Link></li><li><Link href="/guides/how-to-build-your-own-pc">PC building guide</Link></li><li><Link href="/guides/parts-needed-to-build-a-pc">Parts you need</Link></li><li><Link href="/guides/build-a-pc-over-time">Build over time</Link></li></ul></div>
        <div><p className="font-semibold text-white">Gaming</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/gaming">Shop Gaming</Link></li><li><Link href="/guides/gaming-pc-builder-guide">Gaming PC guide</Link></li><li><Link href="/guides/gaming-pc-vs-gaming-laptop">PC vs laptop</Link></li><li><Link href="/guides/how-much-ram-for-gaming">Gaming memory</Link></li></ul></div>
        <div><p className="font-semibold text-white">Shop &amp; help</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/shop">All products</Link></li><li><Link href="/guides">All buying guides</Link></li><li><Link href="/how-to">Shopping &amp; payment</Link></li><li><Link href="/returns-policy">Returns &amp; refunds</Link></li><li><Link href="/contact">Contact support</Link></li></ul></div>
        <div><p className="font-semibold text-white">Information</p><ul className="mt-3 space-y-2 text-sm"><li><Link href="/about">About Innozanzi</Link></li><li><Link href="/account/orders">Track orders</Link></li><li><Link href="/policies/terms">Terms &amp; Conditions</Link></li><li><Link href="/policies/privacy">Privacy Policy</Link></li><li><Link href="/policies/cookies">Cookie Policy</Link></li><li><Link href="/policies/ai-shopping">AI Shopping Policy</Link></li><li><Link href="/partners/apply">Become a partner</Link></li></ul></div>
      </div>
      <div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} {brand.legalName}. All rights reserved.</div>
    </footer>
  );
}
