import { Headphones, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { HeroSlider } from "@/components/store/hero-slider";
import { ProductSection } from "@/components/store/product-section";
import { getHomepageCatalogue } from "@/domain/catalogue/queries";
import { subscribeNewsletter } from "@/domain/communications/actions";
import { entityMetadata } from "@/domain/marketing/seo";
import type { Metadata } from "next";
import { combosEnabled } from "@/domain/combos/settings";
import { BrandPartners } from "@/components/store/brand-partners";

export const dynamic = "force-dynamic";
export async function generateMetadata():Promise<Metadata>{return entityMetadata({entityType:"STATIC_PAGE",entityId:"homepage",path:"/",title:"Innozanzi — Technology That Moves Business Forward",description:"Fast quotations. Expert advice. Nationwide delivery, installation and ongoing support for your business.",image:"/social/innozanzi-share.png"})}

const trustItems = [
  { icon: Truck, title: "Nationwide delivery", body: "Tracked fulfilment across South Africa" },
  { icon: ShieldCheck, title: "Human-verified quotes", body: "Clear recommendations before you commit" },
  { icon: Headphones, title: "Ongoing support", body: "One team from sourcing to after-sales care" },
];

export default async function HomePage() {
  const [catalogue,showCombos] = await Promise.all([getHomepageCatalogue(),combosEnabled()]);
  return (
    <main className="bg-white">
      <HeroSlider products={catalogue.heroProducts}/>

      <section className="border-b border-slate-200 bg-white" aria-label="Why businesses choose Innozanzi">
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-slate-200 px-4 min-[480px]:grid-cols-3 min-[480px]:divide-x min-[480px]:divide-y-0 sm:px-6">
          {trustItems.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3 px-3 py-5 sm:px-5">
              <Icon className="mt-0.5 size-5 shrink-0 text-sky-700" />
              <div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{body}</p></div>
            </div>
          ))}
        </div>
      </section>

      <BrandPartners />

      <div className="bg-slate-50/70">
        <ProductSection eyebrow="Computing built for business" title="Business computers & workstations" products={catalogue.businessComputers} href="/shop?category=business-computers&availability=in-stock" />
      </div>
      <ProductSection eyebrow="Productivity at full resolution" title="Professional displays" products={catalogue.professionalDisplays} href="/shop?category=Computer%20peripherals&availability=in-stock" />
      <div className="bg-slate-50/70">
        <ProductSection eyebrow="The backbone of modern operations" title="Networking, storage & security" products={catalogue.networkAndStorage} href="/shop?category=Networking%20%26%20security&availability=in-stock" />
      </div>
      <ProductSection eyebrow="Keep critical work running" title="Power & business continuity" products={catalogue.powerContinuity} href="/shop?category=Power&availability=in-stock" />

      {showCombos?<section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8"><Link className="flex items-center justify-between rounded-xl bg-[#071b33] px-6 py-5 text-white" href="/combos"><span><strong className="block text-lg">Product Combo Deals</strong><span className="text-sm text-sky-100">Explore daily, weekly and monthly technology packages</span></span><span className="font-bold">View combos →</span></Link></section>:null}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div id="newsletter" className="scroll-mt-24 rounded-xl border border-slate-200 bg-slate-50 px-5 py-8 text-left sm:px-8 sm:py-9 sm:text-center"><h2 className="text-2xl font-semibold text-slate-950">Deals, new arrivals and ICT advice</h2><p className="mt-2 text-sm leading-6 text-slate-600">Useful product and technology updates, without the noise.</p><form action={subscribeNewsletter} className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-[1fr_auto]"><input aria-label="Email address" className="h-14 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-4 text-base outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-700/20" name="email" type="email" inputMode="email" autoComplete="email" placeholder="Email address" required /><button className="h-14 w-full rounded-lg bg-[#071b33] px-7 text-base font-semibold text-white hover:bg-slate-800 sm:w-auto" type="submit">Subscribe</button></form></div>
      </section>
    </main>
  );
}
