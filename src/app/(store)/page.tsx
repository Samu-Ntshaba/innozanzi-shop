import { Headphones, ShieldCheck, Truck } from "lucide-react";
import { HomepageFeatureGrid } from "@/components/store/homepage-feature-grid";
import { ProductSection } from "@/components/store/product-section";
import { getHomepageCatalogue } from "@/domain/catalogue/queries";
import { entityMetadata } from "@/domain/marketing/seo";
import type { Metadata } from "next";
import { BrandPartners } from "@/components/store/brand-partners";
import { getRecommendations } from "@/domain/recommendations/service";
import { RecommendationSection } from "@/components/store/recommendation-section";
import { LazyProductShelf } from "@/components/store/lazy-product-shelf";
import { homepageShelves } from "@/domain/catalogue/homepage-shelves";

export const dynamic = "force-dynamic";
export async function generateMetadata():Promise<Metadata>{return entityMetadata({entityType:"STATIC_PAGE",entityId:"homepage",path:"/",title:"Laptops, Computers & Custom PCs in South Africa | Innozanzi",description:"Buy laptops, computers, components and everyday technology online. Build a compatible custom PC, pay securely and follow your nationwide delivery with Innozanzi.",image:"/social/innozanzi-share.png",keywords:["laptops South Africa","buy computers online","custom PC builder","computer components","Innozanzi"]})}

const trustItems = [
  { icon: Truck, title: "Nationwide delivery", body: "Trusted courier partners across South Africa" },
  { icon: ShieldCheck, title: "Secure payments", body: "Pay safely online or by bank transfer" },
  { icon: Headphones, title: "Ongoing support", body: "One team from sourcing to after-sales care" },
];

export default async function HomePage() {
  const [catalogue,recommendations] = await Promise.all([getHomepageCatalogue(),getRecommendations({limit:4,context:"homepage"})]);
  return (
    <main className="bg-white">
      <HomepageFeatureGrid products={catalogue.heroProducts}/>

      <section className="border-b border-slate-200 bg-white" aria-label="Why customers choose Innozanzi">
        <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-slate-200 px-2 sm:px-6">
          {trustItems.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-2 px-1 py-4 text-center sm:flex-row sm:items-start sm:gap-3 sm:px-5 sm:py-5 sm:text-left">
              <Icon className="size-5 shrink-0 text-sky-700" />
              <div><p className="text-[11px] font-semibold leading-4 text-slate-900 sm:text-sm">{title}</p><p className="mt-0.5 hidden text-xs leading-5 text-slate-500 sm:block">{body}</p></div>
            </div>
          ))}
        </div>
      </section>

      <div className="hidden sm:block"><BrandPartners /></div>
      <div className="bg-white"><RecommendationSection recommendations={recommendations}/></div>

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

      {homepageShelves.map((shelf,index)=><LazyProductShelf key={shelf.key} shelf={shelf} index={index}/>) }
    </main>
  );
}
