import {
  ArrowRight,
  Building2,
  CheckCircle2,
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
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-[#071b33] px-5 py-10 text-white sm:px-10 sm:py-16">
            <div className="absolute -right-24 -top-32 size-96 rounded-full bg-sky-500/20 blur-2xl" />
            <div className="relative max-w-2xl">
              <h1 className="mt-5 text-3xl font-black tracking-tight min-[420px]:text-4xl sm:text-5xl">Business technology made simple.</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-sky-100 sm:text-lg">Get the right technology, a clear quotation and one expert team for delivery and support.</p>
              <div className="mt-7 grid gap-3 min-[420px]:flex min-[420px]:flex-wrap">
                <Link className={cn(buttonVariants({ size: "lg" }), "bg-sky-500 hover:bg-sky-400")} href="/shop">Build your solution <ArrowRight className="ml-2 size-4" /></Link>
                <Link className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-white/40 bg-white/10 text-white hover:bg-white/20")} href="/contact">Talk to an expert</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-slate-200 px-4 min-[480px]:grid-cols-3 min-[480px]:divide-x min-[480px]:divide-y-0 sm:px-6">
          {trustItems.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3 px-3 py-5 sm:px-5">
              <Icon className="mt-0.5 size-6 shrink-0 text-sky-600" />
              <div><p className="text-sm font-bold text-slate-900">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{body}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between"><div><p className="text-sm font-bold uppercase tracking-wider text-sky-600">Shop by category</p><h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Find the right technology</h2></div><Link className="hidden text-sm font-bold text-sky-700 hover:underline sm:block" href="/shop">View all categories</Link></div>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return <Link key={category.id} href={`/categories/${category.slug}`} className="group rounded-xl border border-slate-200 bg-white p-5 text-center transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-lg"><div className="mx-auto grid size-12 place-items-center rounded-full bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white"><Icon className="size-6" /></div><h3 className="mt-3 text-sm font-bold text-slate-900">{category.name}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{category.description}</p></Link>;
          })}
        </div>
      </section>

      <ProductSection eyebrow="Catalogue preview" title="See how products will be presented" products={catalogue.featured} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-2xl bg-[#071b33] text-white md:grid-cols-[1fr_0.8fr]">
          <div className="p-8 sm:p-10"><div className="flex items-center gap-2 text-amber-400"><Building2 className="size-6" /><span className="text-sm font-black uppercase tracking-wider">One trusted technology partner</span></div><h2 className="mt-4 text-3xl font-black">One device or one hundred—we make procurement easier.</h2><p className="mt-3 max-w-xl leading-7 text-sky-100">Get fast provisional pricing, human-verified recommendations and one accountable team for sourcing, configuration, delivery and support.</p><Link className="mt-6 inline-flex items-center rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300" href="/quotations/request">Request a quotation <ArrowRight className="ml-2 size-4" /></Link></div>
          <div className="grid content-center gap-3 bg-sky-950/60 p-8">{["Provisional quotation in approximately 30 seconds", "Human review before the final quotation", "Delivery and installation planning", "Ongoing support after fulfilment"].map((item) => <p key={item} className="flex items-center gap-3 text-sm font-semibold"><CheckCircle2 className="size-5 text-amber-400" />{item}</p>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div id="newsletter" className="scroll-mt-24 rounded-2xl bg-sky-50 p-7 text-center sm:p-10"><h2 className="text-2xl font-black text-slate-950">Deals, new arrivals and ICT advice</h2><p className="mt-2 text-sm text-slate-600">Join the Innozanzi Shop newsletter. No noise—only useful updates.</p><form action={subscribeNewsletter} className="mx-auto mt-5 flex max-w-lg flex-col gap-2 sm:flex-row"><input aria-label="Email address" className="h-12 flex-1 rounded-lg border border-slate-300 bg-white px-4 outline-none focus:border-sky-500" name="email" type="email" placeholder="you@company.co.za" required /><button className="h-12 rounded-lg bg-sky-600 px-6 font-bold text-white hover:bg-sky-700" type="submit">Subscribe</button></form></div>
      </section>
    </main>
  );
}
