import { Headphones, ShieldCheck, Truck } from "lucide-react";
import { HomepageFeatureGrid } from "@/components/store/homepage-feature-grid";
import { ProductSection } from "@/components/store/product-section";
import { getHomepageCatalogue } from "@/domain/catalogue/queries";
import { subscribeNewsletter } from "@/domain/communications/actions";
import { entityMetadata } from "@/domain/marketing/seo";
import type { Metadata } from "next";
import { BrandPartners } from "@/components/store/brand-partners";
import Link from "next/link";

export const dynamic = "force-dynamic";
export async function generateMetadata():Promise<Metadata>{return entityMetadata({entityType:"STATIC_PAGE",entityId:"homepage",path:"/",title:"Laptops, Computers & Custom PCs in South Africa | Innozanzi",description:"Buy laptops, computers, components and everyday technology online. Build a compatible custom PC, pay securely and follow your nationwide delivery with Innozanzi.",image:"/social/innozanzi-share.png",keywords:["laptops South Africa","buy computers online","custom PC builder","computer components","Innozanzi"]})}

const trustItems = [
  { icon: Truck, title: "Nationwide delivery", body: "Trusted courier partners across South Africa" },
  { icon: ShieldCheck, title: "Secure payments", body: "Pay safely online or by bank transfer" },
  { icon: Headphones, title: "Ongoing support", body: "One team from sourcing to after-sales care" },
];

export default async function HomePage() {
  const catalogue = await getHomepageCatalogue();
  return (
    <main className="bg-white">
      <HomepageFeatureGrid products={catalogue.heroProducts}/>

      <section className="border-b border-slate-200 bg-white" aria-label="Why customers choose Innozanzi">
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-slate-200 px-4 min-[480px]:grid-cols-3 min-[480px]:divide-x min-[480px]:divide-y-0 sm:px-6">
          {trustItems.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3 px-3 py-5 sm:px-5">
              <Icon className="mt-0.5 size-5 shrink-0 text-sky-700" />
              <div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{body}</p></div>
            </div>
          ))}
        </div>
      </section>

      <div className="hidden sm:block"><BrandPartners /></div>

      <section className="border-b border-slate-200 bg-[#071b33] text-white">
        <div className="mx-auto grid max-w-7xl gap-7 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:px-8 lg:py-14">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-sky-300">Technology people who listen</p><h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Tell us what you need your computer to do.</h2><p className="mt-4 max-w-3xl leading-7 text-slate-300">We have worked with technology for more than ten years. We help you choose the right laptop, computer or component, keep you informed after payment, and stay available if you need help after delivery.</p></div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row lg:flex-col"><Link className="rounded-lg bg-sky-500 px-5 py-3 text-center font-bold text-[#071b33] hover:bg-sky-400" href="/build-a-pc">Build your PC</Link><Link className="rounded-lg border border-slate-600 px-5 py-3 text-center font-bold text-white hover:border-sky-300" href="/contact">Ask us for help choosing</Link></div>
        </div>
      </section>

      <div className="bg-slate-50/70">
        <ProductSection eyebrow="Popular everyday technology" title="Laptops & computers" products={catalogue.laptopsAndComputers} href="/shop?search=laptop&availability=in-stock" />
      </div>
      <ProductSection eyebrow="Work, study and play" title="Monitors" products={catalogue.monitors} href="/shop?search=monitor&availability=in-stock" />
      <div className="bg-slate-50/70">
        <ProductSection eyebrow="Useful technology for every setup" title="Keyboards, mice & accessories" products={catalogue.accessories} href="/shop?category=Computer%20peripherals&availability=in-stock" />
      </div>
      <ProductSection eyebrow="Wi-Fi, routing and security" title="Networking & connectivity" products={catalogue.networking} href="/shop?category=Networking%20%26%20security&availability=in-stock" />
      <div className="bg-slate-50/70">
        <ProductSection eyebrow="Keep your devices running" title="Power & backup" products={catalogue.powerAndBackup} href="/shop?category=Power&availability=in-stock" />
      </div>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div id="newsletter" className="scroll-mt-24 rounded-xl border border-slate-200 bg-slate-50 px-5 py-8 text-left sm:px-8 sm:py-9 sm:text-center"><h2 className="text-2xl font-semibold text-slate-950">Deals, new arrivals and ICT advice</h2><p className="mt-2 text-sm leading-6 text-slate-600">Useful product and technology updates, without the noise.</p><form action={subscribeNewsletter} className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-[1fr_auto]"><input aria-label="Email address" className="h-14 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-4 text-base outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-700/20" name="email" type="email" inputMode="email" autoComplete="email" placeholder="Email address" required /><button className="h-14 w-full rounded-lg bg-[#071b33] px-7 text-base font-semibold text-white hover:bg-slate-800 sm:w-auto" type="submit">Subscribe</button></form></div>
      </section>
    </main>
  );
}
