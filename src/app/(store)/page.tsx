import { Headphones, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/components/store/category-icon";
import { HeroSlider } from "@/components/store/hero-slider";
import { ProductSection } from "@/components/store/product-section";
import { getHomepageCatalogue } from "@/domain/catalogue/queries";
import { subscribeNewsletter } from "@/domain/communications/actions";
import { entityMetadata } from "@/domain/marketing/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export async function generateMetadata():Promise<Metadata>{return entityMetadata({entityType:"STATIC_PAGE",entityId:"homepage",path:"/",title:"Innozanzi — Technology That Moves Business Forward",description:"Fast quotations. Expert advice. Nationwide delivery, installation and ongoing support for your business.",image:"/social/innozanzi-share.png"})}

const fallbackCategories = [
  { id: "laptops", name: "Laptops", slug: "laptops", description: "Work, study and business notebooks", imagePath: "icon:laptop" },
  { id: "monitors", name: "Monitors", slug: "monitors", description: "Clear displays for productive work", imagePath: "icon:monitor" },
  { id: "power", name: "Power & UPS", slug: "ups-and-power", description: "Keep critical equipment online", imagePath: "icon:power" },
  { id: "network", name: "Networking", slug: "networking", description: "Reliable business connectivity", imagePath: "icon:network" },
];

const trustItems = [
  { icon: Truck, title: "Nationwide delivery", body: "Tracked fulfilment across South Africa" },
  { icon: ShieldCheck, title: "Human-verified quotes", body: "Clear recommendations before you commit" },
  { icon: Headphones, title: "Ongoing support", body: "One team from sourcing to after-sales care" },
];

export default async function HomePage() {
  const catalogue = await getHomepageCatalogue();
  const categories = catalogue.categories.length
    ? catalogue.categories.slice(0, 6)
    : fallbackCategories;
  return (
    <main className="bg-white">
      <HeroSlider />

      <section className="border-b border-slate-200 bg-sky-50"><div className="mx-auto grid max-w-7xl gap-5 px-4 py-7 sm:px-6 lg:grid-cols-[1fr_520px] lg:items-center lg:px-8"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-800">Live business technology catalogue</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">{catalogue.total.toLocaleString("en-ZA")} products ready to quote</h2><p className="mt-1 text-sm text-slate-600">{catalogue.inStock.toLocaleString("en-ZA")} currently available from our authorised supplier, with stock refreshed automatically.</p></div><form action="/shop" className="flex overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm"><input aria-label="Search the catalogue" className="min-h-14 min-w-0 flex-1 px-4 outline-none" name="search" placeholder="Search product, brand, SKU or category"/><button className="bg-[#071b33] px-6 font-semibold text-white">Search</button></form></div></section>

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

      <section aria-label="Product categories" className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-4 text-right"><Link className="text-sm font-semibold text-sky-800 hover:underline" href="/categories">View more categories</Link></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category, index) => {
            return <Link key={category.id} href={`/categories/${category.slug}`} className={`group items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:border-sky-300 hover:bg-sky-50/40 ${index > 1 ? "hidden sm:flex" : "flex"}`}><div className="grid size-9 shrink-0 place-items-center rounded-md bg-slate-100 text-sky-800 transition group-hover:bg-white"><CategoryIcon value={category.imagePath} slug={category.slug}/></div><h2 className="text-sm font-semibold leading-5 text-slate-900">{category.name}</h2></Link>;
          })}
        </div>
      </section>

      <ProductSection products={catalogue.featured} />
      <ProductSection eyebrow="Fresh from our authorised supplier" title="Latest technology" products={catalogue.newest} href="/shop?sort=newest" />

      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8"><Link className="flex items-center justify-between rounded-xl bg-[#071b33] px-6 py-5 text-white" href="/combos"><span><strong className="block text-lg">Product Combo Deals</strong><span className="text-sm text-sky-100">Explore daily, weekly and monthly technology packages</span></span><span className="font-bold">View combos →</span></Link></section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div id="newsletter" className="scroll-mt-24 rounded-xl border border-slate-200 bg-slate-50 px-5 py-8 text-left sm:px-8 sm:py-9 sm:text-center"><h2 className="text-2xl font-semibold text-slate-950">Deals, new arrivals and ICT advice</h2><p className="mt-2 text-sm leading-6 text-slate-600">Useful product and technology updates, without the noise.</p><form action={subscribeNewsletter} className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-[1fr_auto]"><input aria-label="Email address" className="h-14 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-4 text-base outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-700/20" name="email" type="email" inputMode="email" autoComplete="email" placeholder="Email address" required /><button className="h-14 w-full rounded-lg bg-[#071b33] px-7 text-base font-semibold text-white hover:bg-slate-800 sm:w-auto" type="submit">Subscribe</button></form></div>
      </section>
    </main>
  );
}
