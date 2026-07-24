import {
  ArrowRight,
  Headphones,
  Laptop,
  Monitor,
  Network,
  PackageCheck,
  PlugZap,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { ProductSection } from "@/components/store/product-section";
import { buttonVariants } from "@/components/ui/button";
import { getHomepageCatalogue } from "@/domain/catalogue/queries";
import { subscribeNewsletter } from "@/domain/communications/actions";
import { cn } from "@/lib/utils";
import { entityMetadata } from "@/domain/marketing/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export async function generateMetadata():Promise<Metadata>{return entityMetadata({entityType:"STATIC_PAGE",entityId:"homepage",path:"/",title:"Innozanzi — Technology That Moves Business Forward",description:"Fast quotations. Expert advice. Nationwide delivery, installation and ongoing support for your business.",image:"/social/innozanzi-share.png"})}

const fallbackCategories = [
  { id: "laptops", name: "Laptops", slug: "laptops", description: "Work, study and business notebooks", icon: Laptop },
  { id: "monitors", name: "Monitors", slug: "monitors", description: "Clear displays for productive work", icon: Monitor },
  { id: "power", name: "Power & UPS", slug: "ups-and-power", description: "Keep critical equipment online", icon: PlugZap },
  { id: "network", name: "Networking", slug: "networking", description: "Reliable business connectivity", icon: Network },
];

const trustItems = [
  { icon: Truck, title: "Nationwide delivery", body: "Tracked fulfilment across South Africa" },
  { icon: ShieldCheck, title: "Human-verified quotes", body: "Clear recommendations before you commit" },
  { icon: Headphones, title: "Ongoing support", body: "One team from sourcing to after-sales care" },
];

export default async function HomePage() {
  const catalogue = await getHomepageCatalogue();
  const categories = catalogue.categories.length
    ? catalogue.categories.slice(0, 6).map((category, index) => ({ ...category, icon: fallbackCategories[index]?.icon ?? PackageCheck }))
    : fallbackCategories;
  return (
    <main className="bg-white">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="relative overflow-hidden rounded-lg bg-[#071b33] px-5 py-12 text-white sm:px-12 sm:py-20">
            <div className="relative max-w-2xl">
              <p className="text-sm font-semibold tracking-wide text-sky-300">Technology procurement and support</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight min-[420px]:text-4xl sm:text-5xl">Business technology, made straightforward.</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">The right products, a clear quotation and one accountable team for delivery and ongoing support.</p>
              <div className="mt-7 grid gap-3 min-[420px]:flex min-[420px]:flex-wrap">
                <Link className={cn(buttonVariants({ size: "lg" }), "bg-white text-[#071b33] hover:bg-slate-100")} href="/shop">Browse products <ArrowRight className="ml-2 size-4" /></Link>
                <Link className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-slate-500 bg-transparent text-white hover:bg-white/10")} href="/contact">Talk to an expert</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-slate-200 px-4 min-[480px]:grid-cols-3 min-[480px]:divide-x min-[480px]:divide-y-0 sm:px-6">
          {trustItems.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3 px-3 py-5 sm:px-5">
              <Icon className="mt-0.5 size-5 shrink-0 text-sky-700" />
              <div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{body}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-lg font-semibold text-slate-950 sm:text-xl">Shop by category</h2><Link className="text-sm font-semibold text-sky-800 hover:underline" href="/shop">View all</Link></div>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return <Link key={category.id} href={`/categories/${category.slug}`} className="group flex min-w-36 snap-start items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:border-sky-300 hover:bg-sky-50/40 sm:min-w-0"><div className="grid size-9 shrink-0 place-items-center rounded-md bg-slate-100 text-sky-800 transition group-hover:bg-white"><Icon className="size-4" /></div><h3 className="text-sm font-semibold leading-5 text-slate-900">{category.name}</h3></Link>;
          })}
        </div>
      </section>

      <ProductSection eyebrow="Catalogue preview" title="See how products will be presented" products={catalogue.featured} />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div id="newsletter" className="scroll-mt-24 border-y border-slate-200 py-9 text-center"><h2 className="text-2xl font-semibold text-slate-950">Deals, new arrivals and ICT advice</h2><p className="mt-2 text-sm text-slate-600">Useful product and technology updates, without the noise.</p><form action={subscribeNewsletter} className="mx-auto mt-5 flex max-w-lg flex-col gap-2 sm:flex-row"><input aria-label="Email address" className="h-12 flex-1 rounded-md border border-slate-300 bg-white px-4 outline-none focus:border-sky-700 focus:ring-1 focus:ring-sky-700" name="email" type="email" placeholder="you@company.co.za" required /><button className="h-12 rounded-md bg-[#071b33] px-6 font-semibold text-white hover:bg-slate-800" type="submit">Subscribe</button></form></div>
      </section>
    </main>
  );
}
