import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { SupportLauncher } from "@/components/store/support-launcher";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">
    <StoreHeader />
    <aside className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium leading-5 text-amber-950 sm:text-sm">
      Catalogue preview — confirmed products, pricing and availability are coming after distributor clearance.
    </aside>
    {children}
    <StoreFooter />
    <SupportLauncher />
  </div>;
}
