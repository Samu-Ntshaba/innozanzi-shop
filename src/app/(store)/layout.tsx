import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { SupportLauncher } from "@/components/store/support-launcher";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <div className="storefront min-h-screen bg-white">
    <StoreHeader />
    <aside className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-center text-xs font-medium leading-5 text-slate-600 sm:text-sm">
      Catalogue preview — confirmed products, pricing and availability are coming after distributor clearance.
    </aside>
    {children}
    <StoreFooter />
    <SupportLauncher />
  </div>;
}
