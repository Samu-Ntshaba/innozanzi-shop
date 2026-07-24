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

export default async function HomePage() {
  const catalogue = await getHomepageCatalogue();
  const categories = catalogue.categories.length
    ? catalogue.categories.slice(0, 6)
    : fallbackCategories;
  return (
    <main className="bg-white">
      <HeroSlider />

      <section aria-label="Product categories" className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {categories.map((category) => {
            return <Link key={category.id} href={`/categories/${category.slug}`} className="group flex min-w-36 snap-start items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:border-sky-300 hover:bg-sky-50/40 sm:min-w-0"><div className="grid size-9 shrink-0 place-items-center rounded-md bg-slate-100 text-sky-800 transition group-hover:bg-white"><CategoryIcon value={category.imagePath} slug={category.slug}/></div><h2 className="text-sm font-semibold leading-5 text-slate-900">{category.name}</h2></Link>;
          })}
        </div>
        <div className="mt-3 text-right"><Link className="text-sm font-semibold text-sky-800 hover:underline" href="/categories">View more categories →</Link></div>
      </section>

      <ProductSection products={catalogue.featured} />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div id="newsletter" className="scroll-mt-24 border-y border-slate-200 py-9 text-center"><h2 className="text-2xl font-semibold text-slate-950">Deals, new arrivals and ICT advice</h2><p className="mt-2 text-sm text-slate-600">Useful product and technology updates, without the noise.</p><form action={subscribeNewsletter} className="mx-auto mt-5 flex max-w-lg flex-col gap-2 sm:flex-row"><input aria-label="Email address" className="h-12 flex-1 rounded-md border border-slate-300 bg-white px-4 outline-none focus:border-sky-700 focus:ring-1 focus:ring-sky-700" name="email" type="email" placeholder="you@company.co.za" required /><button className="h-12 rounded-md bg-[#071b33] px-6 font-semibold text-white hover:bg-slate-800" type="submit">Subscribe</button></form></div>
      </section>
    </main>
  );
}
