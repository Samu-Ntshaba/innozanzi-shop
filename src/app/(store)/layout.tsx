import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { SupportLauncher } from "@/components/store/support-launcher";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">
    <StoreHeader />
    <aside className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm font-semibold leading-6 text-amber-950">
      Catalogue preview: the products shown demonstrate how our store will work. We’re finalising agreements with our distributors and will go live with confirmed products, pricing and availability as soon as clearance is complete.
    </aside>
    {children}
    <StoreFooter />
    <SupportLauncher />
  </div>;
}
